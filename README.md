# Arden

> Real-time multimodal clinical intelligence for psychiatric assessments, analyzing voice, video, and conversation to surface subtle crisis signals and diagnostic insights instantly.

Team: Shrishant Hattarki, Aakash Kolli, Jason Yap, Yash Yardi
[Devpost](https://devpost.com/software/project-v813inysf24z)

---

## Overview

Arden is a real-time AI copilot for psychiatric assessment that combines continuous video analysis with voice AI to surface diagnostic signals during clinical interviews. Built entirely during NexHacks (January 17-18, 2026).

### What It Does

- **Video Analysis**: Extracts 28 biometric measurements in real-time (eye contact, gaze stability, facial tension, posture, breathing patterns, distress signals)
- **Voice AI**: Conducts empathetic psychiatric interviews with real-time transcription and crisis keyword detection
- **Multimodal Fusion**: Combines visual and audio signals to adapt AI responses based on observed patient state
- **Clinical Dashboard**: Live biometric timeline, differential diagnosis suggestions, and crisis alerts with recommended actions
- **Session Reports**: AI-generated clinical documentation with DSM-5 codes and treatment recommendations

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+ (for LiveKit agent)
- API keys for: Supabase, LiveKit, Overshoot, Gemini

### Installation

```bash
# Install frontend dependencies
npm install

# Copy environment template for frontend
cp .env.example .env

# Edit .env with your API keys (see SETUP.md)

# Run development server
npm run dev
```

Visit **http://localhost:8080**

### Running the Voice Agent

```bash
cd arden-agent
pip install -r requirements.txt

# Create .env.local for agent credentials
cp .env.example .env.local

# Edit .env.local with LiveKit credentials
python src/agent.py dev
```

See [SETUP.md](./SETUP.md) for complete setup instructions.

---

## Project Structure

```
arden/
├── src/                      # React frontend
│   ├── pages/               # Route components
│   ├── components/          # UI components
│   ├── hooks/               # Custom React hooks (useOvershotVision, etc.)
│   ├── lib/                 # Utilities (crisis-detection, livekit-token)
│   ├── types/               # TypeScript definitions
│   └── integrations/        # Supabase client
├── arden-agent/             # LiveKit voice agent (Python)
│   └── src/agent.py         # PsychiatricAssistant agent
├── supabase/
│   └── functions/           # Edge Functions (session insights)
├── .env.example             # Environment template
├── SETUP.md                 # Complete setup guide
└── package.json
```

---

## External Tools & Libraries (Credits)

### Frontend Framework & UI

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| [React](https://react.dev/) | 18.3.1 | UI framework | MIT |
| [TypeScript](https://www.typescriptlang.org/) | 5.6.3 | Type safety | Apache-2.0 |
| [Vite](https://vitejs.dev/) | 5.4.11 | Build tool | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.17 | Styling | MIT |
| [Radix UI](https://www.radix-ui.com/) | various | Accessible components | MIT |
| [React Router](https://reactrouter.com/) | 6.28.0 | Routing | MIT |
| [React Query](https://tanstack.com/query) | 5.60.6 | Data fetching | MIT |
| [React Hook Form](https://react-hook-form.com/) | 7.53.2 | Form management | MIT |
| [Recharts](https://recharts.org/) | 2.15.0 | Data visualization | MIT |
| [Lucide React](https://lucide.dev/) | 0.468.0 | Icons | ISC |
| [date-fns](https://date-fns.org/) | 4.1.0 | Date utilities | MIT |
| [Zod](https://zod.dev/) | 3.23.8 | Schema validation | MIT |
| [clsx](https://github.com/lukeed/clsx) | 2.1.1 | Class utilities | MIT |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 2.5.5 | Tailwind utilities | MIT |
| [class-variance-authority](https://cva.style/) | 0.7.1 | Component variants | Apache-2.0 |
| [cmdk](https://cmdk.paco.me/) | 1.0.0 | Command menu | MIT |
| [Sonner](https://sonner.emilkowal.ski/) | 1.7.1 | Toast notifications | MIT |
| [uuid](https://github.com/uuidjs/uuid) | 11.0.3 | UUID generation | MIT |

### Real-Time Communication (LiveKit)

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| [@livekit/components-react](https://docs.livekit.io/) | 2.9.19 | LiveKit React components | Apache-2.0 |
| [@livekit/components-styles](https://docs.livekit.io/) | 1.1.5 | LiveKit styles | Apache-2.0 |
| [livekit-client](https://docs.livekit.io/) | 2.17.0 | LiveKit client SDK | Apache-2.0 |
| [livekit-server-sdk](https://docs.livekit.io/) | 2.9.1 | LiveKit server SDK | Apache-2.0 |

### Computer Vision (Overshoot)

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| [@overshoot/sdk](https://docs.overshoot.ai/) | 0.1.0-alpha.2 | Real-time vision API | Proprietary |

### Backend & Database

| Service/Library | Purpose | License |
|-----------------|---------|---------|
| [Supabase](https://supabase.com/) | Database, Auth, Edge Functions | Apache-2.0 |
| [@supabase/supabase-js](https://github.com/supabase/supabase-js) | Supabase client | MIT |
| [Deno](https://deno.land/) | Edge Functions runtime | MIT |

### AI Models & APIs

| Service | Purpose | Provider |
|---------|---------|----------|
| [Gemini 2.0-Flash-Exp](https://ai.google.dev/) | Session insights generation | Google |
| [OpenAI GPT-4.1-mini](https://openai.com/) | Voice agent LLM (via LiveKit) | OpenAI |
| [AssemblyAI Universal](https://www.assemblyai.com/) | Speech-to-text (via LiveKit) | AssemblyAI |
| [Cartesia Sonic-3](https://cartesia.ai/) | Text-to-speech (via LiveKit) | Cartesia |
| [Qwen3-VL-30B-A3B-Instruct](https://huggingface.co/Qwen) | Vision model (via Overshoot) | Alibaba/Qwen |

### Python Agent Dependencies

| Library | Purpose | License |
|---------|---------|---------|
| [livekit-agents](https://docs.livekit.io/agents/) | Agent framework | Apache-2.0 |
| [livekit-plugins-silero](https://docs.livekit.io/) | Voice activity detection | Apache-2.0 |
| [livekit-plugins-noise-cancellation](https://docs.livekit.io/) | Audio processing | Apache-2.0 |
| [python-dotenv](https://github.com/theskumar/python-dotenv) | Environment management | BSD-3 |

### Development Tools

| Tool | Purpose | License |
|------|---------|---------|
| [ESLint](https://eslint.org/) | Linting | MIT |
| [PostCSS](https://postcss.org/) | CSS processing | MIT |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | CSS vendor prefixes | MIT |
| [Claude Code](https://claude.ai/claude-code) | AI-assisted development | Anthropic |

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## Environment Variables

### Frontend `.env` (in root `/arden` folder)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_LIVEKIT_API_KEY=your-api-key
VITE_LIVEKIT_API_SECRET=your-api-secret
VITE_OVERSHOOT_API_KEY=your-overshoot-key
```

### Voice Agent `.env.local` (in `/arden-agent` folder)

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### Supabase Secrets

```bash
supabase secrets set GEMINI_API_KEY=your-key
```

---

## Acknowledgments

- **NexHacks** - Hackathon organizers
- **Overshoot** - Real-time vision API and sponsor
- **LiveKit** - Real-time voice infrastructure and sponsor
- **Supabase** - Backend platform
- **Google** - Gemini AI models
- **OpenAI** - GPT models
- **AssemblyAI** - Speech recognition
- **Cartesia** - Text-to-speech
