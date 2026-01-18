# Overshoot Setup Guide for Arden

This guide will walk you through setting up the Overshoot Real-Time Vision integration for the Arden AI Mental Health Companion.

## Prerequisites

1. **Overshoot API Key**
   - Get your API key from [Overshoot Platform](https://overshoot.ai)
   - The API key should already be available in your environment

2. **Gemini API Key** (for Milestone 3.5)
   - Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Installation

The Overshoot SDK has already been installed via:

```bash
npm install @overshoot/sdk
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here

# Overshoot API Key
VITE_OVERSHOOT_API_KEY=your-overshoot-api-key-here

# Gemini API Key (for sentiment analysis)
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

⚠️ **IMPORTANT**: Never commit your `.env` file. It's already in `.gitignore`.

## Project Structure

The Overshoot integration is organized into the following files:

```
src/
├── types/
│   ├── overshoot.ts          # TypeScript types for visual observations
│   └── sentiment.ts          # TypeScript types for sentiment analysis
├── utils/
│   ├── temporalEmotionMemory.ts  # Milestone 2: Temporal memory system
│   └── geminiSentimentAnalysis.ts # Milestone 3.5: Sentiment analysis
├── hooks/
│   └── useOvershotVision.ts   # Milestone 1: Main Overshoot hook
├── pages/
│   └── RealtimeCompanion.tsx  # Main UI page
└── App.tsx                     # Router configuration
```

## How It Works

### Milestone 1: Visual Observation

The `useOvershotVision` hook connects to your camera and analyzes emotional cues in real-time:

```typescript
import { useOvershotVision } from '@/hooks/useOvershotVision';

const { isActive, currentObservation, startVision, stopVision } = useOvershotVision({
  apiKey: OVERSHOOT_API_KEY,
  onNovelObservation: (obs) => {
    console.log('New emotional state:', obs);
  }
});
```

**Output Format:**

```json
{
  "timestamp": 1705676400000,
  "emotion": "calm",
  "behavior": "Still posture",
  "engagement": "Direct eye contact",
  "distress_signal": null
}
```

### Milestone 2: Temporal Memory

The temporal memory system prevents duplicate reactions to the same emotional state:

- Tracks observations for **60 seconds**
- Only forwards **novel emotional changes**
- Automatically prunes old memories

```typescript
import { isNovelObservation } from '@/utils/temporalEmotionMemory';

if (isNovelObservation(observation)) {
  // This is a new emotional state - react to it
}
```

### Milestone 3.5: Sentiment Analysis

Analyzes transcript text for sentiment using Gemini:

```typescript
import { analyzeTranscriptSentiment } from '@/utils/geminiSentimentAnalysis';

const sentiment = await analyzeTranscriptSentiment(
  "I've been feeling really overwhelmed lately",
  GEMINI_API_KEY
);

// Output:
// {
//   "sentiment": "negative",
//   "emotional_tone": "overwhelmed",
//   "confidence": 0.85
// }
```

## Running the Application

1. **Start the development server:**

```bash
npm run dev
```

2. **Navigate to the Real-Time Companion:**

Open your browser and go to: `http://localhost:8080/realtime`

3. **Grant camera permissions** when prompted

4. **Click "Start Observation"** to begin real-time emotion monitoring

## Features

### Visual Observation Panel
- Live camera feed
- Real-time emotion overlay (one-word descriptor)
- Current observation details (emotion, behavior, engagement, distress)
- Performance metrics (latency tracking)

### Temporal Memory Status
- Novel emotional states count
- Total observations count
- Current memory size

### Sentiment Analysis
- Text input for transcript analysis
- Real-time Gemini-powered sentiment detection
- Sentiment history with confidence scores

### Distress Detection
- Automatic detection of distress signals
- Toast notifications for critical states
- Highlighted distress observations in history

## API Configuration

### Overshoot Settings

The hook uses the following Overshoot configuration:

```typescript
{
  apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
  backend: 'overshoot',
  model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
  processing: {
    sampling_ratio: 0.15,    // Sample 15% of frames
    fps: 24,                 // Max 24 frames per second
    clip_length_seconds: 3,  // Analyze 3-second windows
    delay_seconds: 1         // New result every 1 second
  },
  source: {
    type: 'camera',
    cameraFacing: 'user'     // Front-facing camera
  }
}
```

### Tuning Performance

You can adjust these parameters based on your needs:

- **Lower latency**: Decrease `clip_length_seconds` to 1-2 seconds
- **Better accuracy**: Increase `sampling_ratio` to 0.2-0.3
- **Reduce cost**: Decrease `sampling_ratio` to 0.1 or lower
- **Smoother results**: Increase `delay_seconds` to 2-3 seconds

## Troubleshooting

### Camera Not Working

1. **Check browser permissions**: Ensure camera access is granted
2. **Check HTTPS**: Camera only works on `localhost` or HTTPS
3. **Check API key**: Verify your Overshoot API key is correct

### No Observations Appearing

1. **Check console**: Look for error messages
2. **Verify API key**: Ensure `VITE_OVERSHOOT_API_KEY` is set
3. **Check network**: Verify connection to Overshoot servers

### High Latency

1. **Reduce sampling ratio**: Lower to 0.1 for faster processing
2. **Decrease clip length**: Use 1-2 second clips
3. **Check internet speed**: Ensure stable connection

### Sentiment Analysis Failing

1. **Check Gemini API key**: Verify `VITE_GEMINI_API_KEY` is set
2. **Check API quota**: Ensure you haven't exceeded Gemini limits
3. **Check input text**: Ensure text is not empty

## Demo Tips

For the best demo experience:

1. **Lighting**: Ensure good lighting on your face
2. **Camera position**: Position camera at eye level
3. **Background**: Use a plain background
4. **Facial expressions**: Make clear, deliberate expressions
5. **Text input**: Use emotionally varied transcript examples

## Example Demo Flow

1. Start the application
2. Click "Start Observation"
3. Show neutral face → emotion: "neutral"
4. Smile → emotion: "happy" (novel state detected)
5. Look sad → emotion: "sad" (novel state detected)
6. Hold sad expression → no duplicate reactions (temporal memory working)
7. Enter transcript: "I'm feeling really anxious today"
8. Click "Analyze Sentiment" → negative sentiment with "anxious" tone

## Next Steps

- **Milestone 4**: LiveKit integration for voice interaction (coming soon)
- **Milestone 5**: Emotional adaptation based on visual cues
- **Milestone 6**: Distress response system
- **Milestone 7**: End-to-end latency optimization

## Support

For issues or questions:
- Check the [Overshoot Documentation](https://docs.overshoot.ai)
- Review error messages in browser console
- Contact the Arden development team

---

**Note**: This implementation follows the Arden Hackathon Spec for Milestones 1, 2, and 3.5.
