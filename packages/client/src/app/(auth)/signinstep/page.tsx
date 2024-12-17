"use client";

import { useState, useEffect } from "react";

export default function SignInStep() {
  const [step, setStep] = useState(0);
  const [musicList, setMusicList] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prevStep) => prevStep + 1);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleMusicSelect = (music: string) => {
    setSelectedMusic((prevSelected) =>
      prevSelected.includes(music)
        ? prevSelected.filter((m) => m !== music)
        : [...prevSelected, music]
    );
  };

  const handleComplete = () => {
    console.log("Selected Music:", selectedMusic);
    // 다음 단계로 이동하는 로직 추가
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div
        className={`text-2xl font-bold mb-8 ${
          step % 2 === 1 &&
          "transition-all duration-[3000ms] ease-in-out opacity-0 blur-lg transform scale-95"
        }`}>
        {step === 0 && "영영에 오신 것을 환영해요"}
        {step === 2 && "다른 환영 문구"}
        {step === 4 && "먼저, 좋아하는 음악을 선택해주세요."}
      </div>

      {step >= 6 && (
        <>
          <input
            type="text"
            placeholder="음악 검색"
            className="mb-4 p-2 border rounded"
          />
          <div className="grid grid-cols-1 gap-4 mb-4">
            {musicList.slice(0, 20).map((music) => (
              <div
                key={music}
                className={`p-4 border rounded cursor-pointer ${
                  selectedMusic.includes(music) ? "bg-blue-200" : ""
                }`}
                onClick={() => handleMusicSelect(music)}>
                {music}
              </div>
            ))}
          </div>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
            onClick={handleComplete}>
            완료
          </button>
        </>
      )}
    </div>
  );
}
