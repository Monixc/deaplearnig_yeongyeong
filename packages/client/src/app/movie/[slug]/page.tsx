"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface MovieDetails {
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
}

interface Track {
  title: string;
  artist: string;
  spotify_url?: string;
  preview_url?: string;
  album_image?: string;
}

interface MovieData {
  title: string;
  reason?: string;
  musical_elements?: string;
  movieDetails?: MovieDetails;
  tracks?: Track[];
}

export default function MoviePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const loadMovieData = async () => {
      try {
        // 로컬 스토리지에서 추천 영화 데이터 확인
        const rawData = localStorage.getItem("movieRecommendations");
        if (rawData) {
          const recommendations = JSON.parse(rawData);
          const movieTitle = decodeURIComponent(params?.slug as string);
          const recommendation = recommendations.find(
            (rec: any) => rec.title === movieTitle
          );

          if (recommendation) {
            // 미디어 정보 가져오기
            const response = await fetch("/api/media", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: recommendation.title,
                songs: recommendation.ost,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to fetch media details");
            }

            const data = await response.json();
            setMovieData({
              ...recommendation,
              movieDetails: data.movie,
              tracks: data.tracks,
            });
          }
        }
      } catch (error) {
        console.error("Error loading movie data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      loadMovieData();
    }
  }, [status, router, params]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
        <div className="text-center pt-20">Loading...</div>
      </div>
    );
  }

  if (!movieData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
        <div className="text-center pt-20">영화를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto flex h-16 items-center px-4">
          <div className="mr-4">
            <button
              onClick={() => router.back()}
              className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              ← 映詠
            </button>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <span className="text-sm text-gray-300 mr-2">
              {session?.user?.name}
            </span>
            <img
              src={session?.user?.image || "/profile-placeholder.png"}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          </div>
        </div>
      </header>

      {/* 영화 정보 */}
      <main className="container max-w-7xl mx-auto py-8 px-4 space-y-12">
        <div className="relative">
          {/* 영화 포스터 및 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="w-48 mx-auto md:mx-0">
              <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                <img
                  src={movieData.movieDetails?.poster_path}
                  alt={movieData.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-3 space-y-4">
              <h1 className="text-4xl font-bold">{movieData.title}</h1>
              <div className="space-y-2">
                <p className="text-gray-300">
                  평점: {movieData.movieDetails?.vote_average.toFixed(1)} / 10
                </p>
                <p className="text-gray-300">
                  개봉일:{" "}
                  {new Date(
                    movieData.movieDetails?.release_date || ""
                  ).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">추천 이유</h2>
                <p className="text-gray-300">{movieData.reason}</p>
              </div>
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">음악적 특징</h2>
                <p className="text-gray-300">{movieData.musical_elements}</p>
              </div>
            </div>
          </div>

          {/* OST 목록 */}
          <section className="mt-24">
            <h2 className="text-2xl font-semibold mb-6">🎵 영화 OST</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {movieData.tracks
                ?.filter(
                  (track) =>
                    track.album_image || track.preview_url || track.spotify_url
                )
                .map((track, index) => (
                  <div
                    key={index}
                    className="bg-white/5 backdrop-blur-lg rounded-lg p-4 hover:bg-white/10 transition-colors">
                    <div className="aspect-square relative rounded overflow-hidden mb-4">
                      <img
                        src={track.album_image || "/album-placeholder.jpg"}
                        alt={track.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate">
                      {track.title}
                    </h3>
                    <p className="text-xs text-gray-300 truncate">
                      {track.artist}
                    </p>
                    {track.preview_url && (
                      <audio
                        controls
                        className="mt-2 w-full h-8"
                        src={track.preview_url}
                      />
                    )}
                    {track.spotify_url && (
                      <a
                        href={track.spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs text-green-400 hover:text-green-300 block">
                        Spotify에서 듣기
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
