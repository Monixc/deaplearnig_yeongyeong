"use client";

import { useState, useEffect } from "react";
import SpotifyWebApi from "spotify-web-api-node";
import { useRouter } from "next/navigation";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET,
});

export default function SignInStep() {
  const [step, setStep] = useState(1);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getSpotifyToken = async () => {
      try {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error("Spotify credentials are missing");
          return;
        }

        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");
        params.append(
          "scope",
          "user-read-private playlist-read-private user-read-email user-library-read"
        );

        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: params,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Spotify API Error: ${errorText}`);
        }

        const data = await response.json();
        spotifyApi.setAccessToken(data.access_token);

        // 토큰이 정상적으로 설정되었는지 확인
        console.log("Token set:", data.access_token);

        const searchResult = await spotifyApi.searchTracks("year:2024", {
          limit: 18,
          market: "US",
        });
        setTopTracks(searchResult.body.tracks?.items || []);
      } catch (error) {
        console.error("Error initializing Spotify:", error);
      }
    };

    if (step >= 6) {
      getSpotifyToken();
    }
  }, [step]);

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

      // DynamoDB에 저장
      const response = await fetch("/api/music-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "temp-user-id", // 실제 사용자 ID로 교체 필요
          timestamp: new Date().toISOString(),
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save analysis results");
      }

      // 다음 단계로 이동
      router.push("/home");
    } catch (error) {
      console.error("Failed to analyze music taste:", error);
      alert("음악 취향 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <div
        className={`text-2xl font-bold mt-8 mb-12 ${
          step % 2 === 1 &&
          "transition-all duration-[3000ms] ease-in-out opacity-0 blur-lg transform scale-95"
        }`}>
        {step === 0 && "영영에 오신 것을 환영해요"}
        {step === 2 && "다른 환영 문구"}
        {step === 4 && "먼저, 좋아하는 음악을 선택해주세요."}
      </div>

      {step >= 6 && (
        <div className="w-full max-w-4xl flex flex-col h-[calc(100vh-200px)]">
          <div className="sticky top-0 bg-white py-6 z-10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="음악 검색..."
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-24">
            <div className="grid grid-cols-3 gap-4">
              {(searchQuery ? searchResults : topTracks).map((track) => (
                <TrackItem
                  key={track.id}
                  track={track}
                  isSelected={selectedMusic.some(
                    (item) => item.id === track.id
                  )}
                  onSelect={handleMusicSelect}
                />
              ))}
            </div>
          </div>

          {selectedMusic.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                <span>{selectedMusic.length}/20곡 선택됨</span>
                <button
                  onClick={handleComplete}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
                  완료
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TrackItem = ({ track, isSelected, onSelect }: any) => (
  <div
    className={`p-4 border rounded cursor-pointer ${
      isSelected ? "bg-blue-100" : ""
    }`}
    onClick={() => onSelect(track)}>
    <img
      src={track.album.images[1]?.url}
      alt={track.name}
      className="w-full aspect-square object-cover rounded mb-2"
    />
    <div className="font-semibold truncate">{track.name}</div>
    <div className="text-sm text-gray-600 truncate">
      {track.artists.map((artist: any) => artist.name).join(", ")}
    </div>
  </div>
);
