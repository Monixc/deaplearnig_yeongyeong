import { DynamoDB } from "aws-sdk";
import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_DEFAULT_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function fetchTMDBPage(page: number) {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`
  );
  const data = await response.json();
  return data.results || [];
}

export async function GET() {
  try {
    let page = 1;
    let moviesWithOst: any[] = [];
    const maxPages = 5; // 최대 5페이지까지만 시도

    while (moviesWithOst.length < 3 && page <= maxPages) {
      const trendingMovies = await fetchTMDBPage(page);

      // TMDB 영화 제목 목록 추출
      const movieTitles = trendingMovies.map((movie: any) =>
        movie.title.toLowerCase().trim()
      );

      // DynamoDB에서 직접 영화 검색
      const { Items: movieData } = await dynamodb
        .scan({
          TableName: "movie-music-data",
          FilterExpression: movieTitles
            .map((_, index) => `contains(#title, :title${index})`)
            .join(" OR "),
          ExpressionAttributeNames: {
            "#title": "movieTitle",
          },
          ExpressionAttributeValues: movieTitles.reduce(
            (acc, title, index) => ({
              ...acc,
              [`:title${index}`]: title,
            }),
            {}
          ),
        })
        .promise();

      if (!movieData) {
        page++;
        continue;
      }

      // 매칭되는 영화 정보 생성
      const currentPageMovies = trendingMovies
        .map((movie: any) => {
          const movieTitle = movie.title.toLowerCase().trim();
          const matchingOst = movieData.filter(
            (item) => item.movieTitle.toLowerCase().trim() === movieTitle
          );

          if (matchingOst && matchingOst.length > 0) {
            return {
              id: movie.id,
              title: movie.title,
              poster_path: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              overview: movie.overview,
              release_date: movie.release_date,
              vote_average: movie.vote_average,
              ost: matchingOst.map((item) => ({
                title: item.songTitle,
                artist: item.artist,
              })),
            };
          }
          return null;
        })
        .filter(Boolean);

      moviesWithOst = [...moviesWithOst, ...currentPageMovies];
      page++;
    }

    // 3개까지만 반환
    return NextResponse.json(moviesWithOst.slice(0, 3));
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending movies" },
      { status: 500 }
    );
  }
}
