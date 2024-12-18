import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error("TMDB API 요청 실패");
    }

    const data = await response.json();

    // 상위 6개 영화만 선택
    const trendingMovies = data.results.slice(0, 6).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster_path: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      overview: movie.overview,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
    }));

    return NextResponse.json(trendingMovies);
  } catch (error) {
    console.error("트렌딩 영화를 가져오는데 실패했습니다:", error);
    return NextResponse.json(
      { error: "트렌딩 영화를 가져오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
