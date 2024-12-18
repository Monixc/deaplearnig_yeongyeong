import { DynamoDB } from "aws-sdk";
import { OpenAI } from "openai";
import * as fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.REACT_APP_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY!,
  },
});

async function createFineTune() {
  try {
    // 1. DynamoDB에서 데이터 가져오기
    const { Items: movieData } = await dynamodb
      .scan({
        TableName: "movie-music-data",
      })
      .promise();

    if (!movieData) {
      throw new Error("No movie data found");
    }

    // 2. 트레이닝 데이터 생성
    const trainingData = movieData.map((movie) => ({
      messages: [
        {
          role: "system",
          content:
            "당신은 음악 취향을 기반으로 영화를 추천하는 전문가입니다. 사용자의 음악 취향과 영화의 음악적 특성을 깊이 있게 분석하여 추천해주세요.",
        },
        {
          role: "user",
          content: `영화: ${movie.movieTitle}\n노래: ${movie.songTitle}\n아티스트: ${movie.artist}`,
        },
        {
          role: "assistant",
          content: JSON.stringify({
            title: movie.movieTitle,
            musical_elements: `이 영화에서 ${movie.artist}의 "${movie.songTitle}"이(가) 어떻게 사용되었는지 분석`,
            reason: "영화와 음악의 관계 분석",
          }),
        },
      ],
    }));

    // 3. 파일 생성
    const file = await openai.files.create({
      file: new File([JSON.stringify(trainingData)], "training.json", {
        type: "application/json",
      }),
      purpose: "fine-tune",
    });

    console.log("File uploaded:", file.id);

    // 4. 파인튜닝 작업 생성
    const fineTune = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: "gpt-3.5-turbo-1106",
    });

    console.log("Fine-tuning job created:", fineTune.id);

    // 5. 파인튜닝 상태 모니터링
    let job = await openai.fineTuning.jobs.retrieve(fineTune.id);
    console.log("Initial status:", job.status);

    while (job.status === "running" || job.status === "validating_files") {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초마다 체크
      job = await openai.fineTuning.jobs.retrieve(fineTune.id);
      console.log("Current status:", job.status);
    }

    console.log("Fine-tuning completed!");
    console.log("Fine-tuned model:", job.fine_tuned_model);
  } catch (error) {
    console.error("Error in fine-tuning:", error);
  }
}

// 스크립트 실행
createFineTune();
