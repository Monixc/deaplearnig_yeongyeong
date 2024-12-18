import { NextResponse } from "next/server";
import { DynamoDB } from "aws-sdk";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// DynamoDB 설정
const dynamodb = new DynamoDB.DocumentClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY!,
  },
});

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

async function searchSpotifyTrack(
  title: string,
  artist: string,
  token: string
) {
  try {
    // 1. 정확한 검색
    let response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        `${title} ${artist}`
      )}&type=track&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    const tracks = data.tracks?.items || [];

    // 제목이나 아티스트가 부분적으로 일치하는 트랙 찾기
    interface Track {
      name: string;
      artists: { name: string }[];
      external_urls: { spotify: string };
      preview_url: string;
    }

    const matchingTrack = tracks.find(
      (track: Track) =>
        track.name.toLowerCase().includes(title.toLowerCase()) ||
        track.artists.some((a: { name: string }) =>
          a.name.toLowerCase().includes(artist.toLowerCase())
        )
    );

    if (!matchingTrack) return null;

    return {
      title: matchingTrack.name,
      artist: matchingTrack.artists
        .map((a: { name: string }) => a.name)
        .join(", "),
      spotify_url: matchingTrack.external_urls.spotify,
      preview_url: matchingTrack.preview_url,
      album_image: matchingTrack.album.images[0]?.url,
    };
  } catch (error) {
    console.error("Spotify search error:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { title } = await request.json();

    // 1. TMDB에서 영화 정보 가져오기
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        title
      )}`
    );
    const movieData = await movieResponse.json();
    const movie = movieData.results?.[0];

    if (!movie) {
      throw new Error("Movie not found");
    }

    // 2. DynamoDB에서 OST 정보 가져오기
    const { Items: ostItems } = await dynamodb
      .scan({
        TableName: "movie-music-data",
        FilterExpression: "movieTitle = :title",
        ExpressionAttributeValues: {
          ":title": title,
        },
      })
      .promise();

    // 3. Spotify에서 각 OST 정보 가져오기
    const spotifyToken = await getSpotifyToken();
    const tracks = await Promise.all(
      (ostItems || []).map(async (item) => {
        const spotifyData = await searchSpotifyTrack(
          item.songTitle,
          item.artist,
          spotifyToken
        );
        return (
          spotifyData || {
            title: item.songTitle,
            artist: item.artist,
          }
        );
      })
    );

    return NextResponse.json({
      movie: {
        title: movie.title,
        poster_path: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        backdrop_path: movie.backdrop_path
          ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
          : null,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
      },
      tracks,
    });
  } catch (error) {
    console.error("Error fetching media details:", error);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 }
    );
  }
}
