# Arden Milestone Implementation Guide

This document details the implementation of each milestone according to the Arden Hackathon Specification.

## 📋 Milestone Status

| Milestone | Status | Description |
|-----------|--------|-------------|
| **Milestone 1** | ✅ **COMPLETE** | Overshoot Emotional & Behavioral Visual Observer |
| **Milestone 2** | ✅ **COMPLETE** | Temporal Emotion Memory |
| **Milestone 3** | ⏸️ **ON HOLD** | LiveKit Patient-Facing AI Companion |
| **Milestone 3.5** | ✅ **COMPLETE** | Gemini Transcript Sentiment Analysis |
| **Milestone 4** | ⏸️ **PENDING** | LiveKit × Overshoot Emotional Adaptation |
| **Milestone 5** | ⏸️ **PENDING** | Distress & Safety Response |
| **Milestone 6** | ⏸️ **PENDING** | Latency & Real-Time Proof |

---

## ✅ MILESTONE 1: Overshoot Emotional & Behavioral Visual Observer

**Owner**: Overshoot Team
**API Surface**: Overshoot RealtimeVision ONLY
**Status**: ✅ COMPLETE

### Goal
Transform raw webcam video of the patient into low-level, structured, timestamped emotional and behavioral signals that describe what is visible, not what it means.

### Implementation

**Location**: `src/hooks/useOvershotVision.ts`

**Key Features:**
- Real-time camera feed processing
- Emotional state detection (one-word descriptor)
- Behavioral observation (posture, movement)
- Engagement tracking (eye contact, attention)
- Distress signal detection

**Output Format:**
```typescript
interface VisualObservation {
  timestamp: number;
  emotion: string | null;       // e.g., "calm", "sad", "anxious"
  behavior: string | null;      // e.g., "Still posture", "Fidgeting"
  engagement: string | null;    // e.g., "Direct eye contact"
  distress_signal: string | null; // e.g., "Crying", "Head in hands"
}
```

**Configuration:**
```typescript
{
  model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
  processing: {
    sampling_ratio: 0.15,      // 15% of frames
    fps: 24,                   // 24 frames per second
    clip_length_seconds: 3,    // 3-second analysis windows
    delay_seconds: 1           // Results every 1 second
  }
}
```

**Demo Requirement:**
- ✅ Live webcam feed
- ✅ Console-log observations in real time
- ✅ Updates arrive within ~1-2 seconds of behavior change

**Success Criteria:**
- ✅ Observations feel grounded and human-readable
- ✅ No speculative or clinical language
- ✅ Updates arrive with minimal latency

---

## ✅ MILESTONE 2: Temporal Emotion Memory

**Owner**: Overshoot Team
**API Surface**: Overshoot output ONLY
**Status**: ✅ COMPLETE

### Goal
Prevent the system from repeatedly reacting to the same emotional state, while still detecting meaningful emotional changes over time.

### Implementation

**Location**: `src/utils/temporalEmotionMemory.ts`

**Key Features:**
- 60-second memory window
- Duplicate observation suppression
- Automatic memory pruning
- Novel state detection

**How It Works:**
```typescript
const OBSERVATION_MEMORY = new Map<string, number>();
const MEMORY_WINDOW_MS = 60_000; // 60 seconds

function isNovelObservation(obs: VisualObservation): boolean {
  const key = `${obs.emotion}|${obs.behavior}|${obs.engagement}|${obs.distress_signal}`;
  const now = Date.now();

  if (
    OBSERVATION_MEMORY.has(key) &&
    now - OBSERVATION_MEMORY.get(key)! < MEMORY_WINDOW_MS
  ) {
    return false; // Duplicate - suppress it
  }

  OBSERVATION_MEMORY.set(key, now);
  return true;
}
```

**Demo Requirement:**
- ✅ Hold same facial expression → no repeated output
- ✅ Change expression/posture → new observation forwarded instantly

**Success Criteria:**
- ✅ No emotional "spam"
- ✅ Clear emotional transitions are preserved
- ✅ AI feels calm, not reactive

---

## ✅ MILESTONE 3.5: Gemini Transcript Sentiment Analysis

**Owner**: Gemini Team
**API Surface**: Gemini Sentiment Analysis ONLY
**Status**: ✅ COMPLETE

### Goal
Extract lightweight emotional sentiment signals from patient's spoken words using real-time transcription, without inferring intent, diagnosis, or risk.

### Implementation

**Location**: `src/utils/geminiSentimentAnalysis.ts`

**Key Features:**
- Coarse sentiment classification (positive/neutral/negative)
- Optional emotional tone extraction
- Confidence scoring
- No intent or diagnosis inference

**Output Format:**
```typescript
interface TextSentimentObservation {
  timestamp: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  emotional_tone: string | null;  // e.g., "hopeful", "overwhelmed"
  confidence: number;              // 0.0 - 1.0
}
```

**API Configuration:**
```typescript
{
  model: 'gemini-2.0-flash-exp',
  temperature: 0.2,
  maxOutputTokens: 100
}
```

**Rules (LOCKED):**
- ❌ No intent detection
- ❌ No crisis keyword detection
- ❌ No diagnosis inference
- ❌ No safety escalation from text alone
- ✅ Sentiment may modulate tone only
- ✅ Visual distress always overrides text sentiment

**Demo Requirement:**
- ✅ Patient speaks neutral sentence → neutral sentiment
- ✅ Patient expresses discouragement → negative sentiment detected
- ✅ Output logged live alongside visual signals

**Success Criteria:**
- ✅ Sentiment feels reasonable and restrained
- ✅ No overreaction to single phrases
- ✅ Language emotion complements facial emotion

---

## ⏸️ MILESTONE 3: LiveKit Patient-Facing AI Companion

**Owner**: LiveKit Team
**API Surface**: LiveKit Agents ONLY
**Status**: ⏸️ ON HOLD (per user request)

### Goal
Create a real-time AI companion that listens to the patient, transcribes their speech live, displays the transcription on screen, and responds via calm, empathetic voice.

### Planned Implementation

**Agent Setup:**
```typescript
import { AgentSession } from 'livekit-agents'

const agent = new AgentSession({
  stt: 'deepgram/nova-2-medical',
  llm: 'openai/gpt-4o',
  tts: 'cartesia/sonic',
  turn_detection: {
    type: 'silence',
    min_silence_ms: 1200
  }
})
```

**System Prompt (LOCKED):**
```
You are a calm, supportive AI mental health companion.
You speak directly to the patient.

Rules:
- Use simple, empathetic language
- Ask one question at a time
- Never diagnose
- Never give medical advice
- Encourage reflection, grounding, and expression
- If distress escalates, slow down and focus on safety
```

**Status**: Waiting for LiveKit implementation approval

---

## ⏸️ MILESTONE 4: LiveKit × Overshoot Emotional Adaptation

**Owner**: Fusion Team
**API Surface**: Fusion logic ONLY
**Status**: ⏸️ PENDING (depends on Milestone 3)

### Goal
Make the AI change how it speaks based on what the camera sees—tone, pacing, and content all adapt to emotional signals.

### Planned Implementation

**Fusion Logic:**
```typescript
function handleObservation(obs: VisualObservation) {
  if (obs.distress_signal) {
    agent.speak(
      "I notice this feels really heavy right now. Let's slow down together."
    );
    return;
  }

  if (obs.emotion === 'Visible sadness') {
    agent.speak(
      "I can see this is painful. Would you like to share more?"
    );
  }

  if (obs.engagement === 'Reduced eye contact') {
    agent.speak(
      "You don't have to look at the screen. I'm still here with you."
    );
  }
}
```

---

## ⏸️ MILESTONE 5: Distress & Safety Response

**Owner**: Safety Team
**API Surface**: LiveKit response logic ONLY
**Status**: ⏸️ PENDING

### Goal
Ensure the AI responds safely and calmly when visual distress is detected—without panic, alarms, or clinical escalation.

### Trigger Conditions (Visual Only)
- Head in hands + stillness
- Visible shaking or agitation
- Tearful expressions
- Repetitive self-soothing motions

### Planned Implementation
```typescript
if (obs.distress_signal) {
  agent.speak(
    "I'm noticing signs of distress. Would it help to take a slow breath together?"
  );
}
```

---

## ⏸️ MILESTONE 6: Latency & Real-Time Proof

**Owner**: Performance Team
**API Surface**: Metrics only
**Status**: ⏸️ PENDING

### Goal
Prove the system responds fast enough to feel human and conversational, not delayed or robotic.

### Metrics to Collect

**From Overshoot:**
- `result.inference_latency_ms`
- `result.total_latency_ms`

**From LiveKit:**
- STT delay
- TTS delay

**Output:**
```typescript
{
  overshoot_latency_ms: number,
  agent_response_ms: number,
  end_to_end_ms: number
}
```

**Target**: End-to-end response < 2.5 seconds

---

## 🎯 Current Implementation Demo Flow

### What Works Now (Milestones 1, 2, 3.5)

1. **Navigate to Real-Time Companion**
   - Go to `http://localhost:8080/realtime`

2. **Start Visual Observation**
   - Click "Start Observation"
   - Grant camera permissions
   - Live emotion detection begins

3. **Observe Emotional States**
   - Make different facial expressions
   - Watch one-word emotion descriptor update
   - See novel states logged in history

4. **Test Temporal Memory**
   - Hold same expression → no duplicate reactions
   - Change expression → immediate detection

5. **Analyze Transcript Sentiment**
   - Enter sample transcript text
   - Click "Analyze Sentiment"
   - View sentiment classification and emotional tone

### What's Coming Next (Milestones 3-6)

1. **LiveKit Voice Integration**
   - Real-time speech-to-text
   - AI voice responses
   - Natural conversation flow

2. **Emotional Adaptation**
   - AI tone changes based on visual cues
   - Context-aware responses
   - Seamless multimodal interaction

3. **Distress Response**
   - Calm, supportive interventions
   - Grounding exercises
   - Safety-focused dialogue

4. **Performance Optimization**
   - Sub-2.5 second response times
   - Real-time metrics dashboard
   - Latency monitoring

---

## 🔧 Technical Architecture

### Data Flow

```
Camera Feed
    ↓
Overshoot RealtimeVision (Milestone 1)
    ↓
Visual Observations
    ↓
Temporal Memory Filter (Milestone 2)
    ↓
Novel Emotional States
    ↓
[Future] LiveKit Agent (Milestone 3)
    ↓
[Future] Emotional Adaptation (Milestone 4)
    ↓
[Future] Voice Response

Text Input
    ↓
Gemini API (Milestone 3.5)
    ↓
Sentiment Analysis
    ↓
Emotional Context
```

### File Organization

```
src/
├── types/
│   ├── overshoot.ts           # Milestone 1 & 2 types
│   └── sentiment.ts           # Milestone 3.5 types
├── utils/
│   ├── temporalEmotionMemory.ts  # Milestone 2
│   └── geminiSentimentAnalysis.ts # Milestone 3.5
├── hooks/
│   └── useOvershotVision.ts   # Milestone 1
└── pages/
    └── RealtimeCompanion.tsx  # Main UI
```

---

## 📝 Notes

- All Overshoot milestones (1, 2) are **production-ready**
- Gemini sentiment analysis (3.5) is **fully functional**
- LiveKit integration (3-6) is **on hold** pending approval
- UI/UX is **optimized for hackathon demo**
- Documentation is **comprehensive and clear**

---

**Last Updated**: 2026-01-18
**Arden Version**: 1.0.0
**Hackathon**: Arden AI Mental Health Companion
