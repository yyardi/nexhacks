# 🎯 ARDEN FINISH LINE - DO THIS NOW

**Time:** Late, you're tired. **Status:** 80% done. Here's exactly what's left.

---

## ✅ WHAT'S READY (LOCKED IN)

1. ✅ **All Supabase Secrets Set**
   - GEMINI_API_KEY ✅
   - LIVEKIT_API_KEY ✅
   - LIVEKIT_API_SECRET ✅
   - OVERSHOOT_API_KEY ✅

2. ✅ **All Edge Functions Deployed**
   - livekit-token ✅
   - interview-orchestrator ✅
   - analyze-psychiatric ✅
   - generate-session-insights ✅
   - translate-to-english ✅

3. ✅ **LiveKit Dependencies Installed**
   - @livekit/components-react ✅
   - Build error fixed ✅

---

## 🚨 MISSING (DO NOW)

### 1. Add LiveKit URL to .env
**What:** You need your LiveKit Cloud WebSocket URL

**Do this:**
```bash
echo 'VITE_LIVEKIT_URL=wss://YOUR-PROJECT.livekit.cloud' >> .env
```

**Where to get it:**
- Go to https://cloud.livekit.io
- Create/login to project
- Copy WebSocket URL (looks like `wss://xxxxx.livekit.cloud`)
- Paste above

---

### 2. Install Overshoot SDK
```bash
npm install @overshoot/sdk
```

---

### 3. Deploy LiveKit Agent (Python)

**What:** Python server that handles voice conversation

**Create file:** `agent.py`
```python
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, cartesia

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    assistant = VoiceAssistant(
        vad=ctx.room.create_silence_detector(),
        stt=openai.STT(model="deepgram/nova-2-medical"),
        llm=openai.LLM(model="gpt-4o"),
        tts=cartesia.TTS(),
        chat_ctx=llm.ChatContext().append(
            text="""You are a calm, supportive AI mental health companion.

Rules:
- Use simple, empathetic language
- Ask one question at a time
- Never diagnose or give medical advice
- Encourage reflection and grounding
- If distress escalates, slow down and focus on safety"""
        )
    )

    assistant.start(ctx.room)
    await asyncio.sleep(1)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

**Run it:**
```bash
pip install livekit-agents livekit-plugins-openai livekit-plugins-cartesia
python agent.py dev
```

---

## 🎯 THEN YOU'RE DONE (MVP)

After the 3 steps above:

1. **Test Voice:**
   - Run `npm run dev`
   - Go to Dashboard
   - Click "Voice AI" mode
   - Should connect to LiveKit, hear AI speak

2. **Test Camera:**
   - Camera already works (face-api.js)
   - Shows biometrics panel

3. **Overshoot Later:**
   - For now, face-api.js works as placeholder
   - Replace with Overshoot when you have time
   - Not critical for basic demo

---

## 📝 QUICK CHECKLIST

- [ ] Add `VITE_LIVEKIT_URL` to `.env`
- [ ] Run `npm install @overshoot/sdk`
- [ ] Deploy Python LiveKit agent
- [ ] Test: `npm run dev` → Voice AI mode → Hear AI speak
- [ ] ✅ MVP DONE

---

## 🛌 GO TO SLEEP AFTER

You're 80% done. The 3 steps above = working demo.

Overshoot vision can wait. Face-api.js placeholder works for now.

**Focus:** Get voice working. That's the core feature.
