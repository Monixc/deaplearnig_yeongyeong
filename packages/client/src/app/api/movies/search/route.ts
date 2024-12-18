import { DynamoDB } from "aws-sdk";
import { NextResponse } from "next/server";

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.REACT_APP_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { titles } = await request.json();

    if (!Array.isArray(titles)) {
      return NextResponse.json(
        { error: "titles must be an array" },
        { status: 400 }
      );
    }

    // BatchGet으로 여러 영화 정보를 한 번에 조회
    const uniqueTitles = [
      ...new Set(titles.map((t) => t.toLowerCase().trim())),
    ];

    const { Responses, UnprocessedKeys } = await dynamodb
      .batchGet({
        RequestItems: {
          "movie-music-data": {
            Keys: uniqueTitles.map((title) => ({
              movieTitle: title,
            })),
          },
        },
      })
      .promise();

    if (!Responses) {
      return NextResponse.json([]);
    }

    // 응답 데이터 정리
    const movies = Responses["movie-music-data"] || [];
    const moviesByTitle = movies.reduce(
      (acc: { [key: string]: any[] }, movie) => {
        const title = movie.movieTitle.toLowerCase().trim();
        if (!acc[title]) {
          acc[title] = [];
        }
        acc[title].push({
          title: movie.movieTitle,
          songTitle: movie.songTitle,
          artist: movie.artist,
        });
        return acc;
      },
      {}
    );

    return NextResponse.json(moviesByTitle);
  } catch (error) {
    console.error("Error searching movies:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 }
    );
  }
}
