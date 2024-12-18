"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface MovieRecommendation {
  title: string;
  reason: string;
  musical_elements: string;
  ost: { title: string; artist: string }[];
  movieDetails?: MovieDetails;
  tracks?: Track[];
}

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

interface TrendingMovie {
  id: number;
  title: string;
  poster_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
}

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>(
    []
  );
  const [trendingMovies, setTrendingMovies] = useState<TrendingMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const loadRecommendations = async () => {
      try {
        const rawData = localStorage.getItem("movieRecommendations");
        if (!rawData) {
          setLoading(false);
          return;
        }

        const recommendations = JSON.parse(rawData);

        // 각 영화에 대해 미디어 정보 가져오기
        const enrichedRecommendations = await Promise.all(
          recommendations.map(async (rec: MovieRecommendation) => {
            const response = await fetch("/api/media", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: rec.title,
                songs: rec.ost,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to fetch media details");
            }

            const data = await response.json();
            return {
              ...rec,
              movieDetails: data.movie,
              tracks: data.tracks,
            };
          })
        );

        setRecommendations(enrichedRecommendations);
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadTrendingMovies = async () => {
      try {
        const response = await fetch("/api/trending");
        if (!response.ok) {
          throw new Error("Failed to fetch trending movies");
        }
        const data = await response.json();
        setTrendingMovies(data);
      } catch (error) {
        console.error("Error loading trending movies:", error);
      }
    };

    if (status === "authenticated") {
      loadRecommendations();
      loadTrendingMovies();
    }
  }, [status, router]);

  const handleMovieClick = (movie: MovieRecommendation | TrendingMovie) => {
    const movieSlug = encodeURIComponent(movie.title);
    router.push(`/movie/${movieSlug}`);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
        <div className="text-center pt-20">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto flex h-16 items-center px-4">
          <div className="mr-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              映詠
            </h1>
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

      {/* 메인 컨텐츠 */}
      <main className="container max-w-7xl mx-auto py-8 px-4 space-y-12">
        {/* 검색 섹션 */}
        <section className="pt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="어떤 음악을 찾으시나요?"
            className="w-full p-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-lg"
          />
        </section>

        {/* 추천 섹션 */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-6">
            {session?.user?.name}님을 위한 추천 플레이리스트
          </h2>
          {loading ? (
            <div className="text-center">로딩 중...</div>
          ) : recommendations.length === 0 ? (
            <div className="text-center">
              <p>아직 추천된 영화가 없습니다.</p>
              <button
                onClick={() => router.push("/signinstep")}
                className="mt-4 px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-400 transition-colors">
                음악 취향 분석하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  onClick={() => handleMovieClick(rec)}
                  className="group relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 hover:scale-105">
                  <img
                    src={rec.movieDetails?.poster_path}
                    alt={rec.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-200" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h3 className="font-semibold mb-2">{rec.title}</h3>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {rec.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 인기 영화 섹션 */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-6">
            요즘 핫한 영화 플레이리스트
          </h2>
          {trendingMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingMovies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => handleMovieClick(movie)}
                  className="group relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 hover:scale-105">
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-200" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h3 className="font-semibold mb-2">{movie.title}</h3>
                    <p className="text-sm text-gray-300">
                      평점: {movie.vote_average.toFixed(1)} / 10
                    </p>
                    <p className="text-sm text-gray-300">
                      개봉일:{" "}
                      {new Date(movie.release_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400">
              현재 인기 영화 정보를 불러오는 중입니다.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
