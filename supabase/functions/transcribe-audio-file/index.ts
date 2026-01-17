import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!ASSEMBLYAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { audio, filename, contentType } = await req.json();

    if (!audio) {
      return new Response(JSON.stringify({ error: 'No audio data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing audio file: ${filename}, type: ${contentType}`);

    // Decode base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to AssemblyAI
    console.log('Uploading audio to AssemblyAI...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/octet-stream'
      },
      body: bytes
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const { upload_url } = await uploadResponse.json();
    console.log('Audio uploaded, starting transcription...');

    // Start transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true,
        sentiment_analysis: true,
        auto_highlights: true
      })
    });

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      throw new Error(`Transcription request failed: ${error}`);
    }

    const { id: transcriptId } = await transcriptResponse.json();
    console.log(`Transcription started with ID: ${transcriptId}`);

    // Poll for completion
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'Authorization': ASSEMBLYAI_API_KEY }
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll transcription status');
      }

      const result = await pollResponse.json();

      if (result.status === 'completed') {
        transcript = result;
        break;
      } else if (result.status === 'error') {
        throw new Error(`Transcription error: ${result.error}`);
      }

      attempts++;
      console.log(`Polling... attempt ${attempts}, status: ${result.status}`);
    }

    if (!transcript) {
      throw new Error('Transcription timed out');
    }

    console.log('Transcription completed successfully');

    // Format transcript with timestamps and speakers
    let formattedTranscript = '';
    
    if (transcript.utterances && transcript.utterances.length > 0) {
      // Use utterances if available (speaker diarization)
      formattedTranscript = transcript.utterances.map((u: any) => {
        const startTime = formatTime(u.start);
        return `[${startTime}] Speaker ${u.speaker}: ${u.text}`;
      }).join('\n\n');
    } else if (transcript.words && transcript.words.length > 0) {
      // Otherwise use words with timestamps
      let currentSentence = '';
      let sentenceStart = 0;
      
      transcript.words.forEach((word: any, i: number) => {
        if (currentSentence === '') {
          sentenceStart = word.start;
        }
        currentSentence += word.text + ' ';
        
        // Split on sentence endings or after 50 words
        if (word.text.match(/[.!?]$/) || (i > 0 && i % 50 === 0)) {
          formattedTranscript += `[${formatTime(sentenceStart)}] ${currentSentence.trim()}\n\n`;
          currentSentence = '';
        }
      });
      
      if (currentSentence) {
        formattedTranscript += `[${formatTime(sentenceStart)}] ${currentSentence.trim()}`;
      }
    } else {
      formattedTranscript = transcript.text || '';
    }

    return new Response(JSON.stringify({
      transcript: formattedTranscript,
      fullTranscript: transcript.text,
      words: transcript.words,
      utterances: transcript.utterances,
      sentiment_analysis_results: transcript.sentiment_analysis_results,
      auto_highlights_result: transcript.auto_highlights_result,
      duration: transcript.audio_duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}
