"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalyzingPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/home");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

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
