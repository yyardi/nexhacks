# Voice AI Fix - Testing Guide

## Quick Test Procedure

### Test 1: Fresh Page Load Toggle
1. Open app in browser
2. Toggle Voice AI **ON**
3. **Expected**: Agent immediately starts and announces "listening"
4. **Status**: ✅ Should work on first try

### Test 2: Multiple Toggles
1. Toggle Voice AI **ON**
2. Wait for "listening" state
3. Toggle Voice AI **OFF**
4. Toggle Voice AI **ON** again
5. **Expected**: Works immediately without needing to cancel/restart session
6. **Status**: ✅ Should work every time

### Test 3: Page Refresh While Enabled
1. Toggle Voice AI **ON**
2. Refresh page (Cmd+R / Ctrl+R)
3. Toggle Voice AI **ON** again
4. **Expected**: Initializes cleanly without errors
5. **Status**: ✅ Should work after refresh

### Test 4: Rapid Toggle Stress Test
1. Quickly toggle Voice AI ON/OFF/ON/OFF/ON
2. **Expected**: Handles gracefully, eventually settles in correct state
3. **Status**: ✅ Should not crash or leave zombie connections

### Test 5: Error Recovery
1. Disconnect internet
2. Toggle Voice AI **ON**
3. **Expected**: Shows error and retry button
4. Reconnect internet
5. Click retry
6. **Expected**: Connects successfully
7. **Status**: ✅ Should recover from errors

## What to Look For

### ✅ Success Indicators
- "Arden is listening..." appears within 2-3 seconds
- Green pulsing dot shows listening state
- Live transcription section visible
- Voice controls active
- Console logs show "[VoiceAssistant] Voice AI is now listening and ready"

### ❌ Failure Indicators (These should NOT happen)
- Stuck on "Connecting to Arden..."
- Error: "Connection lost. Click retry to reconnect."
- Silent failures (no status change)
- Multiple concurrent connections in console
- Need to end/cancel session to make it work

## Console Monitoring

Open browser DevTools (F12) and watch for these logs:

### On Toggle ON:
```
[Dashboard] Voice AI toggle: ON
[Dashboard] Starting new Voice AI session
[LiveKit] Voice AI enabled, initializing fresh session
[LiveKit] Connected to room: arden-session-XXXXX
[LiveKit] Successfully connected to room
[VoiceAssistant] Room initialized, ready for new session
[VoiceAssistant] State changed to: listening
[VoiceAssistant] Voice AI is now listening and ready
```

### On Toggle OFF:
```
[Dashboard] Voice AI toggle: OFF
[Dashboard] Disabling Voice AI
[LiveKit] Cleaning up Voice AI session
[LiveKit] Disconnected from room
```

## Before/After Comparison

### Before Fix (Broken)
1. Toggle ON → Stuck connecting or silent failure
2. Need to: Start session → End → Cancel → Toggle ON
3. Only works after this exact sequence

### After Fix (Working)
1. Toggle ON → Immediately works ✅
2. No workarounds needed ✅
3. Works every single time ✅

## Test Results Log

Date: ___________
Tester: ___________

| Test | Result | Notes |
|------|--------|-------|
| Fresh page toggle | ☐ Pass ☐ Fail | |
| Multiple toggles | ☐ Pass ☐ Fail | |
| Page refresh | ☐ Pass ☐ Fail | |
| Rapid toggles | ☐ Pass ☐ Fail | |
| Error recovery | ☐ Pass ☐ Fail | |

## Troubleshooting

If tests fail:

1. **Check .env variables**
   - VITE_LIVEKIT_URL
   - VITE_LIVEKIT_API_KEY
   - VITE_LIVEKIT_API_SECRET

2. **Check Python agent is running**
   ```bash
   cd arden-agent
   python3 src/agent.py dev
   ```
   Should show: "starting worker" and "starting inference"

3. **Check browser console for errors**
   - SSL certificate errors
   - CORS issues
   - Token generation failures

4. **Clear browser cache**
   - Hard refresh: Cmd+Shift+R / Ctrl+Shift+R
   - Clear site data in DevTools

5. **Check network connectivity**
   - Can you reach VITE_LIVEKIT_URL?
   - Is Python agent accessible?
