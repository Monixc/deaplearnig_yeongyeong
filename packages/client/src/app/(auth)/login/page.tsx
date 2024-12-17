"use client";
// import { signInWithGoogle } from "@/lib/auth/cognito";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold mb-4">映詠</h1>

        <button className="w-full max-w-xs flex items-center justify-center gap-2 mt-8 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow">
          <img src="/assets/google-logo.svg" alt="Google" className="w-5 h-5" />
          Google로 계속하기
        </button>
      </div>
    </div>
  );
}
