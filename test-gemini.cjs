const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = 'AIzaSyBe2dtEogL3a0Bodi0WqnQx-U9n3o2by6A';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say hello");
    console.log("2.0-flash success:", await result.response.text());
  } catch (e) {
    console.error("2.0-flash error:", e.message);
  }
}

test();
