"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AnalyzingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const getRecommendations = async () => {
      try {
        // 로컬 스토리지에서 데이터 가져오기
        const rawData = localStorage.getItem("musicAnalysis");
        if (!rawData) {
          console.error("No analysis data in localStorage");
          throw new Error("No analysis data found");
        }

        // JSON 파싱
        const analysisData = JSON.parse(rawData);
        console.log("Analysis data from localStorage:", analysisData);

        // API 요청 데이터 구성
        const requestData = {
          genres: analysisData.analysis.genres,
          popularity: analysisData.analysis.popularity,
          selectedTracks: analysisData.analysis.selectedTracks,
        };

        console.log("Sending request to recommendations API:", requestData);

        // 추천 API 호출
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        const responseData = await response.json();
        console.log("API Response:", {
          status: response.status,
          data: responseData,
        });

        if (!response.ok) {
          throw new Error(
            responseData.error ||
              responseData.details ||
              "Failed to get recommendations"
          );
        }

        // 추천 결과 저장
        localStorage.setItem(
          "movieRecommendations",
          JSON.stringify(responseData)
        );

        // 5초 후 home으로 리다이렉트
        setTimeout(() => {
          router.push("/home");
        }, 5000);
      } catch (error) {
        console.error("Detailed error:", {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        alert("추천을 가져오는 중 오류가 발생했습니다.");
        router.push("/signinstep");
      }
    };

    getRecommendations();
  }, [router, session]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">
          사용자님의 취향을 분석하고 있습니다
        </h1>
        <div className="flex items-center justify-center gap-3">
          <span
            className="animate-bounce text-4xl"
            style={{
              color: "#4ade80",
              animationDuration: "1s",
            }}>
            ●
          </span>
          <span
            className="animate-bounce text-4xl"
            style={{
              color: "#86efac",
              animationDuration: "1s",
              animationDelay: "0.2s",
            }}>
            ●
          </span>
          <span
            className="animate-bounce text-4xl"
            style={{
              color: "#bbf7d0",
              animationDuration: "1s",
              animationDelay: "0.4s",
            }}>
            ●
          </span>
        </div>
      </div>
    </div>
  );
}
