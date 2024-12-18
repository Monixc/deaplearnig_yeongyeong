require("dotenv").config({ path: ".env.local" });
const AWS = require("aws-sdk");
const fs = require("fs");

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function prepareTrainingData() {
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

    // 3. JSONL 파일로 저장
    const jsonlData = trainingData
      .map((item) => JSON.stringify(item))
      .join("\n");
    fs.writeFileSync("training_data.jsonl", jsonlData);

    console.log("Training data has been saved to training_data.jsonl");
  } catch (error) {
    console.error("Error preparing training data:", error);
  }
}

prepareTrainingData();
