# 🚀 Arden Quick Start Guide

Get up and running with the Arden AI Mental Health Companion in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or bun package manager
- Overshoot API key ([Get one here](https://overshoot.ai))
- Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
- A webcam for visual emotion detection

## Step 1: Clone and Install

```bash
# Navigate to the project directory
cd /home/user/nexhacks

# Install dependencies
npm install
```

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Supabase (should already be configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here

# Overshoot API Key (REQUIRED for visual observation)
VITE_OVERSHOOT_API_KEY=your-overshoot-api-key-here

# Gemini API Key (REQUIRED for sentiment analysis)
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

## Step 3: Start the Development Server

```bash
npm run dev
```

The application will start at: **http://localhost:8080**

## Step 4: Access the Real-Time Companion

Open your browser and navigate to:

```
http://localhost:8080/realtime
```

## Step 5: Start Emotion Monitoring

1. **Click "Start Observation"** button
2. **Grant camera permissions** when prompted
3. **Position your face** in front of the camera
4. **Watch the emotion detection** in real-time!

---

## 🎯 What to Try

### Test Visual Emotion Detection (Milestone 1)

1. **Neutral Expression** → Should detect "neutral" or "calm"
2. **Smile** → Should detect "happy" or "joyful"
3. **Sad Face** → Should detect "sad" or "distress"
4. **Look Away** → Should detect engagement changes

### Test Temporal Memory (Milestone 2)

1. **Hold a sad expression** for 10 seconds
   - First detection: Appears in "Novel States"
   - Subsequent detections: Filtered out (no spam)

2. **Change to happy**
   - Immediately detected as novel state
   - Added to history

### Test Sentiment Analysis (Milestone 3.5)

1. **Enter a transcript:**
   ```
   I've been feeling really overwhelmed with everything lately.
   ```

2. **Click "Analyze Sentiment"**

3. **Expected output:**
   - Sentiment: **Negative**
   - Emotional Tone: **"overwhelmed"**
   - Confidence: **~80-90%**

---

## 📊 Features Overview

| Feature | Status | Location |
|---------|--------|----------|
| Real-Time Emotion Detection | ✅ Live | `/realtime` |
| Temporal Memory System | ✅ Live | `/realtime` |
| Sentiment Analysis | ✅ Live | `/realtime` |
| Dashboard | ✅ Live | `/dashboard` |
| Session Management | ✅ Live | `/sessions` |
| Authentication | ✅ Live | `/auth` |

---

## 🎨 UI/UX Highlights

The Arden interface features:

- **Modern gradient design** with subtle animations
- **Real-time emotion overlay** directly on video feed
- **Color-coded emotion badges** (green = positive, red = distress, etc.)
- **Performance metrics** showing latency and inference time
- **Temporal memory status** showing novel vs. duplicate states
- **Sentiment history** with confidence visualization
- **Toast notifications** for distress signals

---

## 🧪 Demo Script (For Judges)

### 1. Visual Observation Demo (2 minutes)

```
"Let me show you the real-time emotion detection system."

1. Click "Start Observation"
2. Show neutral face → "See the 'neutral' emotion tag"
3. Smile → "Now it detects 'happy'"
4. Make sad face → "And here's 'sad'"
5. Hold sad face → "Notice no spam - temporal memory working"
```

### 2. Temporal Memory Demo (1 minute)

```
"The system remembers emotional states for 60 seconds."

1. Point to stats: "3 novel states, 12 total observations"
2. Hold same expression → "No new novel states"
3. Change expression → "Immediate detection"
```

### 3. Sentiment Analysis Demo (1 minute)

```
"We can also analyze text sentiment."

1. Type: "I'm feeling anxious and worried"
2. Click "Analyze Sentiment"
3. Show result: "Negative sentiment, 'anxious' tone, 85% confidence"
```

---

## 🔧 Troubleshooting

### Camera Not Working

**Problem**: Camera feed not appearing

**Solutions**:
1. Check browser permissions (should allow camera access)
2. Ensure using HTTPS or localhost
3. Try refreshing the page
4. Check different browser (Chrome recommended)

### No Emotion Detection

**Problem**: Video feed works but no emotions detected

**Solutions**:
1. Check `.env` file has `VITE_OVERSHOOT_API_KEY`
2. Verify API key is valid
3. Check browser console for errors
4. Ensure good lighting on face

### Sentiment Analysis Failing

**Problem**: "Analysis Failed" error

**Solutions**:
1. Check `.env` file has `VITE_GEMINI_API_KEY`
2. Verify API key is valid
3. Check API quota (not exceeded)
4. Ensure input text is not empty

### Slow Performance

**Problem**: High latency (>3 seconds)

**Solutions**:
1. Check internet connection
2. Close other browser tabs
3. Reduce video quality (edit `useOvershotVision.ts` sampling ratio)

---

## 📁 Project Structure

```
arden/
├── src/
│   ├── pages/
│   │   └── RealtimeCompanion.tsx   # Main emotion monitoring page
│   ├── hooks/
│   │   └── useOvershotVision.ts    # Overshoot integration
│   ├── utils/
│   │   ├── temporalEmotionMemory.ts
│   │   └── geminiSentimentAnalysis.ts
│   └── types/
│       ├── overshoot.ts
│       └── sentiment.ts
├── public/
│   ├── arden-logo.svg              # Arden logo
│   └── arden-icon.svg              # Arden icon
├── .env                             # Your API keys (create this!)
└── package.json
```

---

## 🎓 Learning Resources

- **Overshoot Documentation**: https://docs.overshoot.ai
- **Gemini API Guide**: https://ai.google.dev/gemini-api/docs
- **Arden Hackathon Spec**: See project root for full specification
- **Milestone Guide**: See `MILESTONE_GUIDE.md` for implementation details

---

## 🐛 Known Issues

- LiveKit integration not yet implemented (Milestones 3-6)
- Video feed may require HTTPS in production (localhost is fine)
- First emotion detection may take 2-3 seconds (warming up)

---

## 🚀 Next Steps

After getting familiar with the basic features:

1. **Explore the Dashboard** (`/dashboard`)
2. **Create a Session** and try full workflow
3. **Read Milestone Guide** for technical deep dive
4. **Review Overshoot Setup** for advanced configuration
5. **Check out the codebase** to understand architecture

---

## 💡 Tips for Best Results

### For Visual Observation:
- ✅ Good lighting (face clearly visible)
- ✅ Neutral background
- ✅ Face centered in frame
- ✅ Clear facial expressions

### For Sentiment Analysis:
- ✅ Use complete sentences
- ✅ Include emotional context
- ✅ Vary emotional tone to see differences

### For Demos:
- ✅ Start with neutral expression
- ✅ Make slow, deliberate changes
- ✅ Explain temporal memory (key differentiator)
- ✅ Show sentiment analysis with varied inputs

---

## 🏆 Hackathon Highlights

**What Makes Arden Special:**

1. **Real-Time Emotion Detection** - Not post-processing, truly live
2. **Temporal Memory** - Smart filtering prevents emotional spam
3. **Multimodal Analysis** - Vision + Text sentiment combined
4. **Beautiful UI/UX** - Production-quality interface
5. **Privacy-First** - All processing happens in real-time, no storage
6. **Open Architecture** - Ready for LiveKit voice integration

---

## 📞 Support

**Questions?** Check these resources:

- 📖 `OVERSHOOT_SETUP.md` - Detailed Overshoot configuration
- 📋 `MILESTONE_GUIDE.md` - Complete milestone breakdown
- 🔍 `README.md` - Project overview
- 💬 GitHub Issues - Report bugs or ask questions

---

**Ready to go!** 🎉

Start the server and navigate to `/realtime` to begin.

**Pro tip**: Open browser DevTools console to see detailed observation logs!
