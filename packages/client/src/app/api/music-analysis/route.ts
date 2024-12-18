import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.REACT_APP_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Received data:", data);

    const params = {
      TableName: "music_analysis",
      Item: {
        userId: data.userId,
        timestamp: data.timestamp,
        analysis: data.analysis,
      },
    };

    console.log("DynamoDB params:", params);
    await dynamodb.put(params).promise();

    return Response.json({ success: true });
  } catch (error) {
    console.error("DynamoDB Error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
