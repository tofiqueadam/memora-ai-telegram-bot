function formatToTelegramHtml(text) {
  // 1. Escape HTML special characters
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Convert markdown headers (### Title) -> <b>Title</b>
  html = html.replace(/^#{1,6}\s*(.+)$/gm, "<b>$1</b>");

  // 3. Convert **bold** -> <b>bold</b>
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  // 4. Convert ```code blocks``` -> <pre>code</pre>
  html = html.replace(/```([\s\S]*?)```/g, "<pre>$1</pre>");

  // 5. Convert `inline code` -> <code>code</code>
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 6. Convert *italic* -> <i>italic</i>
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, "<i>$1</i>");

  return html;
}

async function sendTelegramMessage(botToken, chatId, text) {
  const formattedHtml = formatToTelegramHtml(text);

  // Attempt to send with clean HTML formatting
  let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formattedHtml,
      parse_mode: "HTML"
    })
  });

  // If HTML parsing fails for any reason, fallback to clean plain text
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
    if (request.method === "POST") {
      try {
        const payload = await request.json();
        if (payload.message && payload.message.text) {
          const chatId = payload.message.chat.id;
          const userText = payload.message.text;

          // 1. Show "typing..." on Telegram
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, action: "typing" })
          });

          // 2. Ask Gemini API with clean formatting instruction
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${env.GEMINI_API_KEY}`;
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userText }] }],
              systemInstruction: {
                parts: [{
                  text: "You are a helpful Telegram AI assistant. Provide clean, well-structured responses. Use bold for section titles and bullet points for lists. Do not use hashtags (#, ##, ###) for headers."
                }]
              }
            })
          });

          const geminiData = await geminiRes.json();
          const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

          // 3. Send formatted reply back to user
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyText);
        }
      } catch (err) {
        console.error("Error handling request:", err);
      }
      return new Response("OK");
    }
    return new Response("Memora AI Telegram Bot is online 24/7! 🟢");
  }
};
