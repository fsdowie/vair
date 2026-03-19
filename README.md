# VAIR - Video Assistant Intelligence Referee

AI-powered referee assistant for interpreting IFAB Laws of the Game 2025/26.

## Features

- 🔐 User authentication (Supabase Auth)
- ⚽ Expert referee decisions based on official IFAB Laws
- 🔗 Direct links to specific Law sections
- 📱 Real-time IFAB updates from @TheIFAB
- 💬 Conversation history
- ⚡ Low-cost, concise responses

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase Edge Functions
- **AI:** Anthropic Claude (Sonnet 4.5)
- **Auth:** Supabase Auth
- **Deployment:** Vercel (frontend) + Supabase (backend)

## Project Structure

```
VAIR/
├── vair-app/              # React frontend
│   └── src/
│       ├── App.jsx
│       ├── RefereeLLM.jsx # Main component
│       └── index.css
├── supabase/
│   └── functions/
│       └── ask-referee/   # Edge Function
│           ├── index.ts
│           └── ifab-updates.ts
├── deploy.sh              # Deployment script
└── README.md
```

## Setup

See [SETUP.md](SETUP.md) for full setup instructions.

## Quick Start

1. **Clone & install:**
   ```bash
   git clone <repo-url>
   cd VAIR/vair-app
   npm install
   ```

2. **Set up Supabase:**
   ```bash
   cd ..
   ./deploy.sh
   ```

3. **Run locally:**
   ```bash
   cd vair-app
   npm run dev
   ```

## Adding IFAB Updates

See [ADD-IFAB-UPDATES.md](ADD-IFAB-UPDATES.md)

## License

MIT
