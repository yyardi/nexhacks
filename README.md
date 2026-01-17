# Arden - Real-Time AI Mental Health Companion

> A fully autonomous AI companion that sees, listens, and adapts to your emotional state in real-time.

## 🌟 Overview

Arden is a real-time AI mental health companion built for the Arden Hackathon. It combines cutting-edge technologies to create a compassionate, perceptive AI that provides emotional support through natural conversation.

### Core Technologies

- **LiveKit Agents** - Real-time voice conversation with live transcription
- **Overshoot RealtimeVision** - Continuous emotional and behavioral perception through camera
- **Google Gemini** - AI-powered sentiment analysis and conversation intelligence
- **React + TypeScript** - Modern, responsive web interface
- **Supabase** - Backend database and edge functions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Google Gemini API key (for sentiment analysis)
- LiveKit account (for Arden features)
- Overshoot API key (for Arden features)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# See SETUP.md for detailed instructions

# Run development server
npm run dev
```

Visit **[http://localhost:8080](http://localhost:8080)** to see the app.

## 📖 Full Setup Instructions

For complete setup instructions including:
- Supabase project creation
- Database migrations
- Edge function deployment
- API key configuration
- Deployment guides

**See [SETUP.md](./SETUP.md)** for the comprehensive guide.

## 🎯 Arden Hackathon Spec

This project implements the real-time AI mental health companion with:

### ✅ Milestone 1: Emotional & Behavioral Visual Observer
- Overshoot RealtimeVision integration
- Real-time facial expression detection
- Posture and engagement monitoring
- Temporal emotion memory

### ✅ Milestone 2: Patient-Facing AI Companion
- LiveKit audio capture and transcription
- AI-generated spoken responses
- Live transcript display
- Natural conversation flow

### ✅ Milestone 3: Emotional Adaptation
- Camera-based emotion detection
- Adaptive AI responses based on visual cues
- Tone, pacing, and content modulation

### ✅ Milestone 4: Distress & Safety Response
- Visual distress signal detection
- Calm, supportive safety responses
- Grounding conversation techniques

## 🏗️ Project Structure

```
nexhacks/
├── src/                    # React frontend
│   ├── pages/             # Route components
│   ├── components/        # UI components
│   ├── hooks/             # Custom React hooks
│   └── integrations/      # Supabase setup
├── supabase/
│   ├── functions/         # Edge Functions (AI logic)
│   └── migrations/        # Database schema
├── .env.example           # Environment template
├── SETUP.md              # Complete setup guide
└── package.json          # Dependencies
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🌐 Deployment

Deploy to Vercel, Netlify, or any static hosting service:

```bash
# Build
npm run build

# Deploy (example with Vercel)
vercel --prod
```

See [SETUP.md](./SETUP.md#deploying-to-production) for deployment guides.

## 🔑 Environment Variables

Required variables (add to `.env`):

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Gemini (for Sentiment Analysis & Edge Functions)
GEMINI_API_KEY=

# LiveKit (for Arden features)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=

# Overshoot (for Arden features)
OVERSHOOT_API_KEY=
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **React Query** - Data fetching
- **React Hook Form** - Form management

### Backend
- **Supabase** - Database & Auth
- **Deno** - Edge Functions runtime
- **Google Gemini** - AI sentiment analysis & conversations
- **LiveKit** - Real-time communication
- **Overshoot** - Computer vision

## 📝 Features

### Current Features
- ✅ User authentication
- ✅ Session management
- ✅ Real-time transcription
- ✅ AI-powered psychiatric analysis
- ✅ Biometric tracking
- ✅ Session insights and reports

### Arden Features (To Implement)
- 🚧 LiveKit voice conversation
- 🚧 Overshoot emotional perception
- 🚧 Real-time emotional adaptation
- 🚧 Distress detection and response
- 🚧 End-to-end latency optimization

## 🤝 Contributing

This is a hackathon project. Contributions are welcome!

## 📄 License

MIT License - feel free to use this project as you wish.

## 🙏 Acknowledgments

- **Arden Hackathon** - For the amazing challenge
- **LiveKit** - Real-time infrastructure
- **Overshoot** - Computer vision technology
- **Supabase** - Backend platform
- **Google Gemini** - AI models

---

**Built with ❤️ for the Arden Hackathon**

For questions or issues, please refer to [SETUP.md](./SETUP.md) or create an issue.
