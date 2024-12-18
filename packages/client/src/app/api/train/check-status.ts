require("dotenv").config({ path: ".env.local" });
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const JOB_ID = "ftjob-iIrNIk4UK7gUnfg05VeR2c4J"; // 방금 받은 Job ID

async function checkStatus() {
  try {
    const job = await openai.fineTuning.jobs.retrieve(JOB_ID);
    console.log("Status:", job.status);
    console.log("Fine-tuned model:", job.fine_tuned_model);
    console.log("Training progress:", {
      trained_tokens: job.trained_tokens,
      training_file: job.training_file,
      status: job.status,
      error: job.error,
    });
  } catch (error) {
    console.error("Error checking status:", error);
  }
}

checkStatus();
