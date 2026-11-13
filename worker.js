function formatToTelegramHtml(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^#{1,6}\s*(.+)$/gm, "<b>$1</b>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  html = html.replace(/```([\s\S]*?)```/g, "<pre>$1</pre>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, "<i>$1</i>");
  return html;
}

async function sendTelegramMessage(botToken, chatId, text) {
  const formattedHtml = formatToTelegramHtml(text);

  let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formattedHtml,
      parse_mode: "HTML"
    })
  });

  if (!res.ok) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
  }
}

export default {
  async fetch(request, env) {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    const geminiKey = env.GEMINI_API_KEY;

    if (request.method === "POST") {
      try {
        const payload = await request.json();
        if (payload.message && payload.message.text) {
          const chatId = payload.message.chat.id;
          const userText = payload.message.text;

          // 1. Show "typing..." on Telegram
          await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, action: "typing" })
          });

          // 2. Call Gemini API
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userText }] }],
              systemInstruction: {
                parts: [{
                  text: "You are a helpful Telegram AI assistant. Provide clean, well-structured responses with clear paragraphs and bullet points. Do not use hashtags (#, ##, ###) for headers."
                }]
              }
            })
          });

          const geminiData = await geminiRes.json();
          const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
            || (geminiData.error ? `⚠️ API Error: ${geminiData.error.message}` : "Sorry, I couldn't generate a response.");

          // 3. Send formatted reply back to user
          await sendTelegramMessage(botToken, chatId, replyText);
        }
      } catch (err) {
        console.error("Error handling request:", err);
      }
      return new Response("OK");
    }
    return new Response("Memora AI Telegram Bot is online 24/7! 🟢");
  }
};
