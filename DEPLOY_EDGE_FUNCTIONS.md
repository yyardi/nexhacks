# Deploy Supabase Edge Functions

Quick guide to deploy your edge functions to Supabase.

## Edge Functions Overview

You have **8 edge functions** ready to deploy:

### Existing Functions (7)
1. `analyze-psychiatric` - Psychiatric analysis with Gemini
2. `generate-session-insights` - Session insights generation
3. `interview-orchestrator` - Interview flow management
4. `translate-to-english` - Translation service
5. `realtime-chat` - Real-time chat (future)
6. `transcribe-audio` - Audio transcription (future)
7. `transcribe-audio-file` - File transcription (future)

### New Function (1)
8. `analyze-sentiment` - **Secure Gemini sentiment analysis** ✨

## Deploy All Functions

### Option 1: Deploy All at Once

```bash
supabase functions deploy
```

This will deploy all functions in the `supabase/functions/` directory.

### Option 2: Deploy Specific Function

To deploy just the new sentiment analysis function:

```bash
supabase functions deploy analyze-sentiment
```

## Verify Deployment

After deploying, test the sentiment function:

```bash
supabase functions invoke analyze-sentiment \
  --body '{"text":"I am feeling really happy today!"}'
```

Expected response:
```json
{
  "timestamp": 1705676400000,
  "sentiment": "positive",
  "emotional_tone": "happy",
  "confidence": 0.9
}
```

## Check Function Logs

To see logs for debugging:

```bash
supabase functions logs analyze-sentiment
```

## Secrets Required

Your secrets are already configured (you showed me earlier):
- ✅ `GEMINI_API_KEY` - For sentiment analysis
- ✅ `OVERSHOOT_API_KEY` - For vision processing
- ✅ `LIVEKIT_API_KEY` - For voice (future)
- ✅ `LIVEKIT_API_SECRET` - For voice (future)
- ✅ `SUPABASE_ANON_KEY` - For authentication
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- ✅ `SUPABASE_URL` - Your Supabase URL
- ✅ `SUPABASE_DB_URL` - Database connection

## Test from Frontend

Once deployed, your `/realtime` page will automatically use the edge function:

1. Go to http://localhost:8080/realtime
2. Enter text in sentiment analysis box
3. Click "Analyze Sentiment"
4. Edge function is called securely (API key stays on server)

## Troubleshooting

### Function Not Found
```bash
# List all deployed functions
supabase functions list
```

### Function Errors
```bash
# Check logs
supabase functions logs analyze-sentiment --tail
```

### Permission Errors
Make sure your Supabase project is linked:
```bash
supabase link --project-ref your-project-ref
```

## Security Notes

✅ **Secure**: Gemini API key is never exposed to browser
✅ **Fast**: Edge function runs close to users (global network)
✅ **Scalable**: Auto-scales with traffic
✅ **Cost-effective**: Only pay for actual usage

---

**Ready to deploy!** Run `supabase functions deploy` to deploy all functions.
