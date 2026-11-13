# Memora AI - Telegram Bot Powered by Google Gemini

A 24/7 Telegram AI assistant powered by Google Gemini API.

## Features
- Multi-turn conversational memory
- Fast responses powered by Gemini 2.5/3.5 Flash Lite
- Support for Python (polling) and Cloudflare Workers (serverless webhook)

## Setup Locally

1. Clone repository:
   ```bash
   git clone https://github.com/tofiqueadam/memora-ai-telegram-bot.git
   cd memora-ai-telegram-bot
   ```

2. Create virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Configure `.env`:
   ```env
   TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. Run the bot:
   ```bash
   python bot.py
   ```

## Cloudflare Workers (Free 24/7 Cloud Hosting)
Use `worker.js` to deploy to Cloudflare Workers with zero server management!
