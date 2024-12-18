import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

async function getMovieDetails(title: string) {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`
  );
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    const movie = data.results[0];
    return {
      title: movie.title,
      poster_path: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      backdrop_path: `https://image.tmdb.org/t/p/original${movie.backdrop_path}`,
      overview: movie.overview,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
    };
  }
  return null;
}

async function getSpotifyTracks(
  token: string,
  movieTitle: string,
  songs: any[]
) {
  const tracks = await Promise.all(
    songs.map(async (song) => {
      const query = `track:${song.title} artist:${song.artist}`;
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.tracks && data.tracks.items.length > 0) {
        const track = data.tracks.items[0];
        return {
          ...song,
          spotify_url: track.external_urls.spotify,
          preview_url: track.preview_url,
          album_image: track.album.images[0]?.url,
        };
      }
      return song;
    })
  );
  return tracks;
}

export async function POST(request: Request) {
  try {
    const { title, songs } = await request.json();

    // TMDB에서 영화 정보 가져오기
    const movieDetails = await getMovieDetails(title);

    // Spotify에서 음악 정보 가져오��
    const spotifyToken = await getSpotifyToken();
    const tracksWithSpotify = await getSpotifyTracks(
      spotifyToken,
      title,
      songs
    );

    return NextResponse.json({
      movie: movieDetails,
      tracks: tracksWithSpotify,
    });
  } catch (error) {
    console.error("Error fetching media details:", error);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 }
    );
  }
}
