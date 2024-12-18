"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-green-900 text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur">
        <div className="container max-w-5xl mx-auto flex h-14 items-center px-4">
          <div className="mr-4 flex">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              映詠
            </h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <button
              onClick={() => router.push("/profile")}
              className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <img
                src="/profile-placeholder.png"
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 container max-w-5xl mx-auto py-6 md:py-12 px-4">
        {/* 검색 섹션 */}
        <section className="mb-12">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="어떤 음악을 찾으시나요?"
            className="w-full p-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-lg"
          />
        </section>

        {/* 맞춤 추천 섹션 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold tracking-tight mb-4 text-center">
            사용자님을 위한 추천 플레이리스트
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="group relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 transform hover:scale-105">
                <img
                  src={`/movie-placeholder-${i}.jpg`}
                  alt="Movie"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-200" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <h3 className="font-semibold mb-2">영화 제목 {i}</h3>
                  <p className="text-sm text-gray-300">
                    선호하는 {i}번째 장르와 비슷한 영화입니다
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 인기 영화 섹션 */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight mb-4 text-center">
            요즘 핫한 영화 플레이리스트
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="group relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 transform hover:scale-105">
                <img
                  src={`/movie-placeholder-${i}.jpg`}
                  alt="Movie"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-200" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <h3 className="font-semibold mb-2">인기 영화 {i}</h3>
                  <p className="text-sm text-gray-300">
                    현재 인기 있는 영화 OST 모음
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
