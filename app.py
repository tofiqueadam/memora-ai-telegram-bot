import os
import threading
import telebot
from dotenv import load_dotenv
from google import genai
import gradio as gr

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
client = genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1beta"})

MODEL_NAME = "gemini-flash-lite-latest"

user_chats = {}

def get_user_chat(user_id):
    if user_id not in user_chats:
        user_chats[user_id] = client.chats.create(model=MODEL_NAME)
    return user_chats[user_id]

@bot.message_handler(commands=['start'])
def send_welcome(message):
    user_chats[message.from_user.id] = client.chats.create(model=MODEL_NAME)
    bot.reply_to(
        message,
        "👋 Hello! I am **Memora AI**, your personal assistant powered by Google Gemini.\n\n"
        "Ask me anything! Type /reset at any time to clear our conversation history.",
        parse_mode="Markdown"
    )

@bot.message_handler(commands=['reset'])
def reset_chat(message):
    user_chats[message.from_user.id] = client.chats.create(model=MODEL_NAME)
    bot.reply_to(message, "🔄 Conversation history has been reset. What's on your mind?")

@bot.message_handler(commands=['help'])
def help_command(message):
    bot.reply_to(
        message,
        "💡 **How to use me:**\n"
        "- Just send any message or question, and I'll reply!\n"
        "- /reset - Start a fresh conversation\n"
        "- /help - Show this help message",
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda message: True)
def handle_message(message):
    chat = get_user_chat(message.from_user.id)
    bot.send_chat_action(message.chat.id, 'typing')
    
    try:
        response = chat.send_message(message.text)
        reply_text = response.text or "I couldn't generate a response."
    except Exception as e:
        try:
            res = client.models.generate_content(
                model=MODEL_NAME,
                contents=message.text
            )
            reply_text = res.text or "No response generated."
        except Exception as inner_e:
            reply_text = f"⚠️ Error: {inner_e}"

    max_len = 4000
    for i in range(0, len(reply_text), max_len):
        chunk = reply_text[i:i + max_len]
        try:
            bot.reply_to(message, chunk, parse_mode="Markdown")
        except Exception:
            bot.reply_to(message, chunk)

def run_telegram_bot():
    print("🤖 Starting Memora AI Telegram Bot Polling...")
    bot.infinity_polling()

# Run the Telegram polling in a daemon thread
threading.Thread(target=run_telegram_bot, daemon=True).start()

# Gradio interface to satisfy Hugging Face Space port check
with gr.Blocks(title="Memora AI Telegram Bot") as demo:
    gr.Markdown("# 🤖 Memora AI Bot is Online!")
    gr.Markdown("This Hugging Face Space hosts the Telegram bot **[@memoraAIv1_bot](https://t.me/memoraAIv1_bot)**.")
    gr.Markdown("Status: **Active & Listening** 🟢")

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
