# Arden Real-Time Emotion Detection Setup

Complete setup guide for the Arden AI Mental Health Companion with Overshoot real-time emotion detection.

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your Logo

Place your PNG logo file here:
```
/home/user/nexhacks/public/arden-logo.png
```

### 3. Set Up API Keys

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
# Supabase (should already be configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here

# Required for Real-Time Emotion Detection
VITE_OVERSHOOT_API_KEY=your-overshoot-api-key-here
```

**Get API Key:**
- Overshoot: https://overshoot.ai

**Note:** Gemini API key is stored in Supabase Secrets (already configured), not in `.env`

### 4. Start the Server

```bash
npm run dev
```

### 5. Test It

Open: http://localhost:8080/realtime

Click "Start Observation" and grant camera access.

---

## 📋 What's Implemented

### Milestone 1: Real-Time Visual Emotion Detection
- Live camera feed processing using Overshoot AI
- Detects: emotion, behavior, engagement, distress signals
- One-word emotion displayed on screen
- Updates every 1-2 seconds

### Milestone 2: Temporal Emotion Memory
- Prevents duplicate reactions to same emotion
- 60-second memory window
- Only shows novel emotional state changes
- No "emotional spam"

### Milestone 3.5: Text Sentiment Analysis
- Gemini AI analyzes transcript text via Supabase Edge Function
- Secure: API key stored on server, not exposed in browser
- Returns: sentiment (positive/neutral/negative)
- Includes emotional tone and confidence score
- No diagnosis or crisis detection

---

## 🎬 Demo Flow (For Hackathon)

### Test Visual Emotion Detection (2 min)
1. Go to `/realtime`
2. Click "Start Observation"
3. Show neutral face → see "neutral" or "calm"
4. Smile → see "happy" or "joyful"
5. Make sad face → see "sad"
6. Hold sad face for 10 seconds → no duplicate reactions (temporal memory working!)

### Test Temporal Memory (1 min)
1. Look at stats panel: "3 novel states, 12 total observations, 3 in memory"
2. Change expression → immediate detection as new novel state

### Test Sentiment Analysis (1 min)
1. Enter text: "I'm feeling really anxious and overwhelmed"
2. Click "Analyze Sentiment"
3. See result: Negative sentiment, "anxious" tone, ~85% confidence

---

## 🔧 Technical Details

### Overshoot Configuration
```typescript
Model: Qwen/Qwen3-VL-30B-A3B-Instruct
Sampling: 15% of frames @ 24 FPS
Window: 3-second clips with 1-second delay
Latency Target: <2.5 seconds end-to-end
```

### Output Format
```json
{
  "timestamp": 1705676400000,
  "emotion": "calm",           // One-word descriptor
  "behavior": "Still posture",
  "engagement": "Direct eye contact",
  "distress_signal": null      // Only set if visible distress
}
```

### Files Structure
```
src/
├── hooks/
│   └── useOvershotVision.ts        # Main Overshoot integration
├── utils/
│   ├── temporalEmotionMemory.ts    # Memory filtering
│   └── geminiSentimentAnalysis.ts  # Calls edge function for sentiment
├── types/
│   ├── overshoot.ts                # Type definitions
│   └── sentiment.ts                # Type definitions
└── pages/
    └── RealtimeCompanion.tsx       # Main UI (/realtime page)

supabase/functions/
└── analyze-sentiment/              # Gemini sentiment edge function
    └── index.ts
```

---

## 🎨 UI Features

### Real-Time Companion Page (`/realtime`)
- Live camera feed with emotion overlay
- Color-coded emotion badges (green=positive, red=distress, blue=neutral)
- Current observation details (emotion, behavior, engagement, distress)
- Performance metrics (inference latency, total latency)
- Temporal memory status (novel states, total observations, memory size)
- Text sentiment analysis input
- Sentiment history with confidence bars
- Novel emotional states history
- Toast notifications for distress signals

---

## 🐛 Troubleshooting

### Camera Not Working
- **Check browser permissions** - Allow camera access when prompted
- **Use HTTPS or localhost** - Camera API requires secure context
- **Try different browser** - Chrome/Edge recommended

### No Emotions Detected
- **Check API key** - Verify `VITE_OVERSHOOT_API_KEY` in `.env`
- **Check console** - Open DevTools (F12) and look for errors
- **Good lighting** - Make sure your face is well-lit
- **Face camera** - Look directly at camera

### Sentiment Analysis Not Working
- **Check API key** - Verify `VITE_GEMINI_API_KEY` in `.env`
- **Check quota** - Ensure you haven't exceeded Gemini API limits
- **Try shorter text** - Keep input under 500 characters

### Slow Performance
- **Check internet** - Need stable connection for API calls
- **Reduce sampling** - Edit `useOvershotVision.ts`, change `sampling_ratio: 0.15` to `0.10`
- **Longer delays** - Change `delay_seconds: 1` to `2` or `3`

---

## 🔑 Environment Variables Explained

**Frontend Variables (VITE_*)** - These are embedded in browser JavaScript:
- `VITE_OVERSHOOT_API_KEY` - For real-time visual emotion detection (camera access required)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public key

**Backend Variables** - These are set in Supabase Secrets (for Edge Functions):
- `GEMINI_API_KEY` - Secure server-side sentiment analysis (already configured)
- `OVERSHOOT_API_KEY` - Backup/server-side vision processing (already configured)
- `LIVEKIT_API_KEY` - Real-time voice (future, already configured)
- `LIVEKIT_API_SECRET` - Real-time voice (future, already configured)

**Why two Overshoot keys?**
- `VITE_OVERSHOOT_API_KEY` - Frontend, for direct camera access (required by Overshoot SDK)
- `OVERSHOOT_API_KEY` - Backend secret (available for future server-side processing)
---

## 📦 Build & Deploy

### Test Build
```bash
npm run build
```

Should complete with no TypeScript errors.

### Preview Build
```bash
npm run preview
```

### Deploy
Follow your normal deployment process. Make sure to set environment variables in your hosting platform.

---

## 💡 Tips for Best Demo

### Camera Setup
- ✅ Good lighting on face
- ✅ Plain background
- ✅ Camera at eye level
- ✅ Face centered in frame

### For Emotion Detection
- Make **clear, deliberate** facial expressions
- **Hold expression** for 2-3 seconds for best detection
- **Change slowly** between emotions
- **Explain temporal memory** - key differentiator from other solutions

### For Sentiment Analysis
- Use **emotionally varied** examples
- Try positive: "I'm feeling hopeful and excited about the future"
- Try negative: "I'm feeling anxious and overwhelmed"
- Try neutral: "I need to go to the store later"

---

## 🎯 What Makes This Special

1. **True Real-Time** - Not post-processing, live emotion detection
2. **Temporal Intelligence** - Smart memory prevents duplicate reactions
3. **Multimodal** - Vision + text sentiment combined
4. **Production UI/UX** - Beautiful, professional interface
5. **Privacy-First** - Real-time processing, no permanent storage

---

## 🔮 Future (Not Implemented Yet)

The following are planned but **not yet implemented**:
- LiveKit voice interaction (Milestone 3)
- AI voice responses adapting to emotions (Milestone 4)
- Distress response system (Milestone 5)
- End-to-end latency optimization (Milestone 6)

---

## 📞 Need Help?

1. **Check browser console** (F12) for error messages
2. **Verify API keys** are correct in `.env`
3. **Check network tab** in DevTools for failed requests
4. **Read error messages** - they're usually helpful

---

## ✅ Checklist Before Demo

- [ ] Dependencies installed (`npm install`)
- [ ] Logo added to `/public/arden-logo.png`
- [ ] `.env` file created with API keys
- [ ] Dev server running (`npm run dev`)
- [ ] Camera permissions granted
- [ ] Tested emotion detection works
- [ ] Tested temporal memory (hold same expression)
- [ ] Tested sentiment analysis
- [ ] Good lighting setup
- [ ] Browser is Chrome or Edge

---

**You're ready to go!** 🎉

Navigate to http://localhost:8080/realtime and start your demo.
