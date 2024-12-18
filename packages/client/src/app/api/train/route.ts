import { DynamoDB } from "aws-sdk";
import { OpenAI } from "openai";

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

interface TrainingExample {
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
}

export async function POST(request: Request) {
  try {
    // 1. DynamoDB에서 전체 영화-음악 데이터 가져오기
    const { Items: movieData } = await dynamodb
      .scan({
        TableName: "movie-music-data",
      })
      .promise();

    if (!movieData) {
      throw new Error("No movie data found");
    }

    // 2. 트레이닝 데이터 형식으로 변환
    const trainingExamples: TrainingExample[] = movieData.map((movie) => {
      // 영화와 음악의 특성 분석
      const analyzeMusicalElements = () => {
        // 아티스트와 곡의 특성을 고려한 설명 생성
        return `이 영화에서 ${movie.artist}의 "${movie.songTitle}"이(가) 어떻게 사용되었는지, 어떤 장면에서 어떤 효과를 주었는지, 영화의 분위기와 어떻게 어울렸는지 등을 분석하여 설명`;
      };

      const analyzeRecommendationReason = () => {
        // 영화와 음악의 관계, 장르, 분위기 등을 고려한 추천 이유 생성
        return `이 영화가 왜 사용자의 음악 취향과 맞는지, 어떤 음악적 요소가 ���력적인지, 어떤 감정을 전달하는지 등을 분석하여 설명`;
      };

      return {
        messages: [
          {
            role: "system",
            content:
              "당신은 음악 취향을 기반으로 영화를 추천하는 전문가입니다. 사용자의 음악 취향과 영화의 음악적 특성을 깊이 있게 분석하여 추천해주세요.",
          },
          {
            role: "user",
            content: `영화: ${movie.movieTitle}
노래: ${movie.songTitle}
아티스트: ${movie.artist}
장르: [영화 장르]
분위기: [영화 분위기]
주요 장면: [노래가 사용된 주요 장면]
음악 특성: [노래의 특성, 템포, 분위기 등]`,
          },
          {
            role: "assistant",
            content: JSON.stringify({
              title: movie.movieTitle,
              musical_elements: analyzeMusicalElements(),
              reason: analyzeRecommendationReason(),
            }),
          },
        ],
      };
    });

    // 3. OpenAI 파인튜닝 API 호출
    const file = await openai.files.create({
      file: Buffer.from(JSON.stringify(trainingExamples)),
      purpose: "fine-tune",
    });

    const fineTune = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: "gpt-3.5-turbo-1106",
    });

    return new Response(JSON.stringify({ jobId: fineTune.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Training error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to start training",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
