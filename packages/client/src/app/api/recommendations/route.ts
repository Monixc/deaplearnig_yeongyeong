import { OpenAI } from "openai";
import { DynamoDB } from "aws-sdk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const userTaste = await request.json();
    console.log("Received user taste data:", userTaste);

    if (!userTaste.genres || !userTaste.selectedTracks) {
      console.log("Invalid user taste data:", userTaste);
      return new Response(
        JSON.stringify({
          error: "Invalid user taste data",
          received: userTaste,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 0. 먼저 사용 가능한 영화 목록 가져오기
    console.log("Fetching available movies...");
    const { Items: availableMovies } = await dynamodb
      .scan({
        TableName: "movie-music-data",
      })
      .promise();

    // 영화 제목 중복 제거
    const availableMovieTitles = [
      ...new Set(availableMovies?.map((movie) => movie.movieTitle)),
    ];
    console.log("Available movies:", availableMovieTitles);

    // 1. GPT에 추천 요청 (사용 가능한 영화 목록 전달)
    console.log("Requesting GPT recommendations...");
    const gptRecommendations = await getGptRecommendations(
      userTaste,
      availableMovieTitles
    );
    console.log("GPT recommendations received:", gptRecommendations);

    // 2. DynamoDB에서 관련 영화 데이터 조회
    console.log("Fetching movie data from DynamoDB...");
    const movieData = await getMovieData(gptRecommendations);
    console.log("Movie data received:", movieData);

    // 3. 최종 추천 결과 생성
    console.log("Combining recommendations...");
    const finalRecommendations = combineRecommendations(
      gptRecommendations,
      movieData,
      userTaste
    );
    console.log("Final recommendations:", finalRecommendations);

    return new Response(JSON.stringify(finalRecommendations), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Detailed recommendation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function generatePrompt(userTaste: any, availableMovies: string[]) {
  const topArtists = userTaste.selectedTracks
    .map((t: any) => t.artists)
    .flat()
    .reduce((acc: { [key: string]: number }, artist: string) => {
      acc[artist] = (acc[artist] || 0) + 1;
      return acc;
    }, {});

  const mostFrequentArtists = Object.entries(topArtists)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([artist]) => artist);

  return `
사용자의 음악 취향을 분석해서 영화를 추천해주세요.

[음악 취향 데이터]
1. 주요 선호 장르: ${userTaste.genres.join(", ")}
2. 선호 아티스트: ${mostFrequentArtists.join(", ")}
3. 음악 인기도 수준: ${userTaste.popularity}/100

[추천 가능한 영화 목록]
${availableMovies.join("\n")}

[추천 요청사항]
1. 위 [추천 가능한 영화 목록] 중에서만 3-5개를 추천해주세요.
2. 각 영화마다 추천 이유를 음악적 관점에서 설명해주세요.
3. 특히 해당 영화의 OST나 음악적 요소가 사용자의 취향과 어떻게 ��관되는지 구체적으로 설명해주세요.
4. 반드시 [추천 가능한 영화 목록]에 있는 영화만 추천해야 합니다.

응답 형식:
{
  "recommendations": [
    {
      "title": "영화 제목 (정확히 목록에 있는 제목 사용)",
      "reason": "추천 이유 (음악적 관점에서)",
      "musical_elements": "주요 음악적 요소 설명"
    },
    ...
  ]
}

JSON 형식으로만 응답주세요.`;
}

function calculateMatchingScore(movie: any, userTaste: any) {
  let score = 0;

  // 아티스트 매칭 (여러 OST의 아티스트들과 비교)
  const artistMatch = userTaste.selectedTracks.some((track: any) =>
    track.artists.some((artist: string) =>
      movie.songs.some((song: any) =>
        song.artist.toLowerCase().includes(artist.toLowerCase())
      )
    )
  );
  if (artistMatch) score += 0.5;

  // 인기도 매칭 (임시로 고정값 사용)
  score += 0.5;

  return score;
}

async function getGptRecommendations(
  userTaste: UserTaste,
  availableMovies: string[]
) {
  try {
    const prompt = generatePrompt(userTaste, availableMovies);
    console.log("Generated GPT prompt:", prompt);

    const completion = await openai.chat.completions.create({
      model: process.env.FINE_TUNED_MODEL_ID || "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: `당신은 음악 취향을 기반으로 영화를 추천하는 전문가입니다. 
          주어진 영화 목록에서만 추천해야 하며, 목록에 없는 영화는 절대 추천하면 안 됩니다.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from GPT");
    }

    const parsedResponse = JSON.parse(content) as GptResponse;

    // 추천된 영화가 모두 사용 가능한 목록에 있는지 확인
    const validRecommendations = parsedResponse.recommendations.filter((rec) =>
      availableMovies.some((movie) => movie === rec.title)
    );

    if (validRecommendations.length === 0) {
      throw new Error("No valid recommendations from available movies");
    }

    return { recommendations: validRecommendations };
  } catch (error) {
    console.error("GPT API error:", error);
    throw error;
  }
}

async function getMovieData(gptRecommendations: GptResponse) {
  try {
    const titles = gptRecommendations.recommendations.map((r) => r.title);

    if (!titles.length) {
      throw new Error("No movie titles in recommendations");
    }

    try {
      const { Items: movies } = await dynamodb
        .scan({
          TableName: "movie-music-data",
          FilterExpression: titles
            .map((_, index) => `movieTitle = :title${index}`)
            .join(" OR "),
          ExpressionAttributeValues: titles.reduce(
            (acc, title, index) => {
              acc[`:title${index}`] = title;
              return acc;
            },
            {} as { [key: string]: string }
          ),
        })
        .promise();

      // 영화별로 OST 데이터 그룹화
      const movieOstMap = (movies || []).reduce(
        (acc: { [key: string]: any }, item) => {
          if (!acc[item.movieTitle]) {
            acc[item.movieTitle] = {
              title: item.movieTitle,
              songs: [],
            };
          }
          acc[item.movieTitle].songs.push({
            title: item.songTitle,
            artist: item.artist,
          });
          return acc;
        },
        {}
      );

      return Object.values(movieOstMap);
    } catch (dbError) {
      console.warn("DynamoDB error:", dbError);
      return [];
    }
  } catch (error) {
    console.error("Movie data processing error:", error);
    return [];
  }
}

function combineRecommendations(
  gptRecommendations: GptResponse,
  movieData: any[],
  userTaste: UserTaste
) {
  return gptRecommendations.recommendations
    .map((gptRec) => {
      // DynamoDB에��� 매칭되는 영화 찾기
      const movieMatch = movieData?.find((movie) => {
        const matchResult = movie?.title
          ?.toLowerCase()
          .includes(gptRec.title.toLowerCase());
        console.log("Movie matching:", {
          gptTitle: gptRec.title,
          movieTitle: movie?.title,
          matched: matchResult,
          movieData: movie,
        });
        return matchResult;
      });

      const result = {
        title: gptRec.title,
        reason: gptRec.reason,
        musical_elements: gptRec.musical_elements,
        movieData: movieMatch || null,
        matchingScore: movieMatch
          ? calculateMatchingScore(movieMatch, userTaste)
          : 0,
        ost: movieMatch?.songs || null,
      };

      console.log("Recommendation result:", result);
      return result;
    })
    .sort((a, b) => b.matchingScore - a.matchingScore);
}
