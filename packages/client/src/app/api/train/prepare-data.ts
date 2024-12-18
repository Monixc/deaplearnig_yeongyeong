require("dotenv").config({ path: ".env.local" });
import { DynamoDB } from "aws-sdk";
const fs = require("fs");

const dynamodb = new DynamoDB.DocumentClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY!,
  },
});

async function prepareTrainingData() {
  try {
    const { Items: movieData } = await dynamodb
      .scan({
        TableName: "movie-music-data",
      })
      .promise();

    if (!movieData) {
      throw new Error("No movie data found");
    }

    const trainingExamples = movieData.map((movie) => ({
      messages: [
        {
          role: "system",
          content:
            "당신은 음악 취향을 기반으로 영화를 추천하는 전문가입니다. 각 영화의 음악과 영화의 관계, 감정적 연결성, 분위기 등을 깊이 있게 분석하여 추천해주세요.",
        },
        {
          role: "user",
          content: `사용자의 음악 취향:
- 선호 장르: 인디 록, 팝
- 선호 아티스트: Coldplay, Imagine Dragons
- 음악 인기도: 75/100

영화 정보:
제목: ${movie.movieTitle}
수록곡: ${movie.songTitle}
아티스트: ${movie.artist}

이 영화가 위 음악 취향을 가진 사용자에게 얼마나 잘 맞을지, 그 이유는 무엇인지 분석해주세요.`,
        },
        {
          role: "assistant",
          content: JSON.stringify({
            title: movie.movieTitle,
            musical_elements: "분석이 필요한 부분입니다",
            reason: "분석이 필요한 부분입니다",
          }),
        },
      ],
    }));

    const jsonlData = trainingExamples
      .map((item) => JSON.stringify(item))
      .join("\n");
    fs.writeFileSync("training_data.jsonl", jsonlData);

    console.log("Training data has been saved to training_data.jsonl");
  } catch (error) {
    console.error("Error preparing training data:", error);
  }
}

prepareTrainingData();
