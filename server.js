const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;
const AI_URL = "http://127.0.0.1:8080/v1/chat/completions";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  console.log("وصل طلب من التطبيق:", req.body.message);
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "اكتب رسالة أولاً." });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
          )
          .slice(-20)
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, 4000)
          }))
      : [];

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen",
        messages: [
          {
            role: "system",
            content: "أنت Typhoon AI، مساعد ذكي يتحدث العربية. أجب بوضوح واختصار."
          },
          ...safeHistory,
          { role: "user", content: message.trim().slice(0, 4000) }
        ],
        stream: false,
        max_tokens: 300
      }),
      signal: AbortSignal.timeout(300000)
    });

    if (!response.ok) {
      console.error("AI server status:", response.status);
      return res.status(502).json({ error: "النموذج لم يتمكن من الإجابة." });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    res.json({ answer: answer || "لم يصل رد من النموذج." });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(502).json({
      error: "تعذر الاتصال بالنموذج. تأكد أن llama-server يعمل على المنفذ 8080."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Typhoon AI يعمل على المنفذ ${PORT}`);
});
