"use client";

import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  //로그인 함수
  const handleLogin = () => {
    //구글 로그인 로직 추가
    router.replace("/home");
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen max-w-md mx-auto">
      <div className="font-bold text-4xl">映詠</div>
      <div className="position-absolute bottom-0 right-0" onClick={handleLogin}>
        Login
      </div>
    </div>
  );
}
