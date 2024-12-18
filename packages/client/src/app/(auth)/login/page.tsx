"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleSpotifyLogin = () => {
    signIn("spotify", { callbackUrl: "/signinstep" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-black to-green-900">
      <div className="w-full flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold mb-4 text-white">映詠</h1>
        <p className="text-gray-300 text-center max-w-md">
          음악과 영화를 연결하다.
        </p>

        <button
          onClick={handleSpotifyLogin}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 transform hover:scale-105">
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Spotify로 시작하기
        </button>

        <div className="text-gray-400 text-sm text-center mt-4">
          로그인하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다
        </div>
      </div>
    </div>
  );
}
