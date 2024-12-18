"use client";

import { useState, useEffect } from "react";
import SpotifyWebApi from "spotify-web-api-node";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface ExtendedAlbum extends SpotifyApi.AlbumObjectSimplified {
  popularity?: number;
}

export default function SignInStep() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [spotifyApi] = useState(
    () =>
      new SpotifyWebApi({
        clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
        clientSecret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET,
      })
  );
  const router = useRouter();

  const loadInitialTracks = async () => {
    try {
      const result = await spotifyApi.getNewReleases({
        limit: 18,
        country: "KR",
      });

      if (result.body.albums) {
        const tracks = result.body.albums.items.map((album: ExtendedAlbum) => ({
          id: album.id,
          name: album.name,
          artists: album.artists,
          album: {
            images: album.images,
          },
          popularity: album.popularity || 0,
        }));
        setTopTracks(tracks);
      }
    } catch (error) {
      console.error("Error loading initial tracks:", error);
      try {
        const searchResult = await spotifyApi.searchTracks(
          "genre:k-pop year:2024",
          {
            limit: 18,
            market: "KR",
          }
        );
        setTopTracks(searchResult.body.tracks?.items || []);
      } catch (searchError) {
        console.error("Error searching tracks:", searchError);
      }
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.accessToken) {
      spotifyApi.setAccessToken(session.accessToken);
      loadInitialTracks();
    }
  }, [status, session, router, spotifyApi]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          setTimeout(() => setStep(2), 3500);
          return prev;
        }
        return prev < 2 ? prev + 1 : prev;
      });
    }, 2000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await spotifyApi.searchTracks(query, {
        limit: 18,
        market: "US",
      });
      setSearchResults(result.body.tracks?.items || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  };

  const handleMusicSelect = (track: any) => {
    if (
      selectedMusic.length >= 20 &&
      !selectedMusic.some((item) => item.id === track.id)
    ) {
      alert("최대 20곡까지 선택할 수 있습니다.");
      return;
    }

    setSelectedMusic((prev) =>
      prev.some((item) => item.id === track.id)
        ? prev.filter((item) => item.id !== track.id)
        : [...prev, track]
    );
  };

  const analyzeMusicTaste = async (tracks: SpotifyApi.TrackObjectFull[]) => {
    try {
      // 1. 아티스트 장르 분석
      const artistIds = [
        ...new Set(
          tracks.flatMap((track) => track.artists.map((artist) => artist.id))
        ),
      ];
      const artistsInfo = await spotifyApi.getArtists(artistIds);

      // 2. 장르 빈도수 계산
      const genreCounts = artistsInfo.body.artists
        .flatMap((artist) => artist.genres)
        .reduce((acc: { [key: string]: number }, genre) => {
          acc[genre] = (acc[genre] || 0) + 1;
          return acc;
        }, {});

      // 3. 상위 5개 장르 추출
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre]) => genre);

      // 4. 곡의 특성 분석
      const analysis = {
        genres: topGenres,
        popularity:
          tracks.reduce((sum, track) => sum + track.popularity, 0) /
          tracks.length,
        tracks: tracks.map((track) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist) => artist.name),
          popularity: track.popularity,
        })),
      };

      return analysis;
    } catch (error) {
      console.error("Error analyzing music taste:", error);
      throw error;
    }
  };

  const handleComplete = async () => {
    if (selectedMusic.length < 20) {
      alert("20곡을 모두 선택해주세요!");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeMusicTaste(selectedMusic);

      // 분석 데이터 생성
      const analysisData = {
        userId: session?.user?.id || "anonymous",
        analysis: {
          genres: analysis.genres,
          popularity: analysis.popularity,
          selectedTracks: analysis.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            artists: track.artists,
            popularity: track.popularity,
          })),
        },
      };

      // 로컬 스토리지에 저장
      localStorage.setItem("musicAnalysis", JSON.stringify(analysisData));

      // DynamoDB에 저장
      const response = await fetch("/api/music-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save analysis results");
      }

      if (!result.success) {
        throw new Error("Failed to save analysis results");
      }

      console.log("Analysis saved successfully:", result);

      // 분석 페이지로 이동
      router.push("/analyzing");
    } catch (error) {
      console.error("Failed to analyze music taste:", error);
      alert(
        error instanceof Error
          ? error.message
          : "음악 취향 분석 중 오류가 발생했습니다."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
      {step < 2 && (
        <div className="w-full max-w-lg mx-auto text-center px-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div
            className={`transition-all duration-[2500ms] ease-in-out absolute w-full ${
              step === 0
                ? "opacity-100 transform scale-100 translate-y-0"
                : "opacity-0 transform scale-95 -translate-y-4"
            }`}>
            <h1 className="text-4xl font-bold">영영에 오신 것을 환영합니다</h1>
          </div>
          <div
            className={`transition-all duration-[2500ms] ease-in-out absolute w-full ${
              step === 1
                ? "opacity-100 transform scale-100 translate-y-0"
                : "opacity-0 transform scale-95 translate-y-4"
            }`}>
            <h1 className="text-4xl font-bold">
              먼저, 좋아하는 음악을 선택해주세요
            </h1>
          </div>
        </div>
      )}

      <div
        className={`w-full transition-all duration-1000 ease-in-out ${
          step >= 2
            ? "opacity-100 transform scale-100"
            : "opacity-0 transform scale-95 pointer-events-none absolute"
        }`}>
        <div className="w-full max-w-4xl px-8 mx-auto">
          <div className="sticky top-0 pt-6 pb-4 bg-gradient-to-b from-black to-transparent z-10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="음악을 검색해보세요"
              className="w-full p-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-lg"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-6 pb-24 overflow-y-auto scrollbar-hide p-2">
            {(searchQuery ? searchResults : topTracks).map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                isSelected={selectedMusic.some((item) => item.id === track.id)}
                onSelect={handleMusicSelect}
              />
            ))}
          </div>

          {selectedMusic.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-green-900 to-transparent backdrop-blur-md p-6">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                <span className="text-lg font-semibold">
                  {selectedMusic.length}/20곡 선택됨
                </span>
                <button
                  onClick={handleComplete}
                  disabled={selectedMusic.length < 20}
                  className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 
                    ${
                      selectedMusic.length >= 20
                        ? "bg-green-500 hover:bg-green-400 text-white"
                        : "bg-white/10 text-gray-400 cursor-not-allowed"
                    }`}>
                  {isAnalyzing ? "분석 중..." : "완료"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TrackItem = ({ track, isSelected, onSelect }: any) => (
  <div
    onClick={() => onSelect(track)}
    className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200 transform hover:scale-105 ${
      isSelected ? "ring-2 ring-green-500" : ""
    }`}>
    <div className="relative aspect-square">
      <img
        src={track.album.images[0]?.url}
        alt={track.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-200" />
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="font-semibold truncate">{track.name}</div>
        <div className="text-sm text-gray-300 truncate">
          {track.artists.map((artist: any) => artist.name).join(", ")}
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  </div>
);
