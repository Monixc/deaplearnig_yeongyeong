import { DynamoDB } from "aws-sdk";
import { NextResponse } from "next/server";

// AWS SDK 설정
const awsConfig = {
  accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID!,
  secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY!,
  region: "ap-northeast-2",
};

// AWS SDK 자격 증명 설정
const AWS = require("aws-sdk");
AWS.config.update(awsConfig);

const dynamodb = new DynamoDB.DocumentClient();

export async function POST(request: Request) {
  try {
    // AWS 자격 증명 확인
    if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
      console.error("AWS credentials missing:", {
        hasAccessKey: !!awsConfig.accessKeyId,
        hasSecretKey: !!awsConfig.secretAccessKey,
        region: awsConfig.region,
      });
      return NextResponse.json(
        { error: "AWS credentials not properly configured" },
        { status: 500 }
      );
    }

    const data = await request.json();
    console.log("Received data for music analysis:", data);

    if (!data.userId || !data.analysis) {
      console.error("Missing required fields:", { data });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const uniqueId = `${data.userId}_${timestamp}`;

    const params = {
      TableName: "movie-music-data",
      Item: {
        movieId: `music_analysis_${uniqueId}`,
        songId: `analysis_${uniqueId}`,
        movieTitle: `User Analysis - ${data.userId}`,
        songTitle: "Music Analysis",
        artist: "System",
        userId: data.userId,
        timestamp: timestamp,
        analysis: data.analysis,
        type: "music_analysis",
      },
    };

    console.log("DynamoDB params for music analysis:", params);
    await dynamodb.put(params).promise();

    return NextResponse.json({ success: true, data: params.Item });
  } catch (error) {
    console.error("Music analysis DynamoDB Error:", error);
    return NextResponse.json(
      {
        error: "Failed to save music analysis",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
