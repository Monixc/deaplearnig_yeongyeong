require("dotenv").config({ path: ".env.local" });
const { OpenAI } = require("openai");
const fs = require("fs");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function startFineTuning() {
  try {
    // 1. 파일 업로드
    console.log("Uploading training file...");
    const file = await openai.files.create({
      file: fs.createReadStream("training_data.jsonl"),
      purpose: "fine-tune",
    });
    console.log("File uploaded with ID:", file.id);

    // 2. 파인튜닝 시작
    console.log("Starting fine-tuning...");
    const fineTuningJob = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: "gpt-3.5-turbo-1106",
    });

    console.log("Fine-tuning started! Job ID:", fineTuningJob.id);
    console.log("You can check the status using:");
    console.log(`openai api fine_tuning.jobs.list`);
  } catch (error) {
    console.error("Error starting fine-tuning:", error);
  }
}

startFineTuning();
