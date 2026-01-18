# LiveKit Room & Arden Voice AI Integration

## Room Details

| Property | Value |
|----------|-------|
| **Room Name** | `arden-session-1` |
| **LiveKit URL** | `wss://arden-uppm9p99.livekit.cloud` |
| **Region** | US East B |

## Integrated Features

| Feature | Description |
|---------|-------------|
| **Voice AI Pipeline** | STT (AssemblyAI) → LLM (GPT-4.1 Mini) → TTS (Cartesia Sonic-3) |
| **Crisis Detection** | Real-time scanning for suicide, self-harm, violence, psychosis keywords |
| **Clinical Assessments** | PHQ-9 (depression), GAD-7 (anxiety), C-SSRS (suicide risk) |
| **Emotion-Aware** | Adapts responses based on client-side facial emotion signals |
| **Session Tracking** | Maintains transcript, crisis signals, and assessment progress |

## Quick Start

### 1. Start the Backend Agent

```bash
cd arden-agent
source .venv/bin/activate
export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")
python src/agent.py dev
```

### 2. Start the Frontend

```bash
cd ..  # Back to nexhacks root
npm run dev
```

### 3. Use the Dashboard

1. Go to `http://localhost:8080/dashboard`
2. Toggle the **"Voice AI"** switch in the Session Recording card
3. The camera will activate for emotion detection
4. Click the microphone button to start talking to Arden

## Testing Options

### Option A: Via Arden Dashboard (Recommended)

The Arden website now has integrated LiveKit voice AI. Just:
1. Run both the agent and frontend
2. Enable Voice AI mode on the Dashboard
3. Start talking!

### Option B: LiveKit Playground

1. Go to https://meet.livekit.io
2. Click "Custom Server"
3. Enter:
   - **URL:** `wss://arden-uppm9p99.livekit.cloud`
   - **Token:** (generate a new one - see below)
4. Click Connect

## Generate a New Token

```bash
cd arden-agent
source .venv/bin/activate
export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")

python3 -c "
from livekit import api
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

token = api.AccessToken(
    os.getenv('LIVEKIT_API_KEY'),
    os.getenv('LIVEKIT_API_SECRET'),
)
token.with_identity('user-1')
token.with_name('Test User')
token.with_grants(api.VideoGrants(
    room_join=True,
    room='arden-session-1',
))

print(token.to_jwt())
"
```

## Environment Setup

The `.env.local` file in the project root should have:

```env
# LiveKit Configuration (for arden-agent)
LIVEKIT_URL=wss://arden-uppm9p99.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Vite Frontend LiveKit Variables
VITE_LIVEKIT_URL=wss://arden-uppm9p99.livekit.cloud
VITE_LIVEKIT_TOKEN=your-jwt-token
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Arden Website (React)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ VideoCapture│  │LiveKitVoice  │  │  BiometricsPanel  │  │
│  │ (face-api)  │──│   Panel      │──│  (pulse, gaze)    │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │ Emotion Signals                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LiveKit Room Connection                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WebRTC / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  LiveKit Cloud Server                        │
│                wss://arden-uppm9p99.livekit.cloud           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Arden Agent (Python / LiveKit Agents)          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ STT         │  │ LLM         │  │ TTS                 │ │
│  │ AssemblyAI  │──│ GPT-4.1 Mini│──│ Cartesia Sonic-3    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         ▼                ▼                ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │   Crisis    │  │ Clinical    │  │   Emotion       │    │
│  │  Detection  │  │ Assessments │  │   Adaptation    │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```
