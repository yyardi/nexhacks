import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    let openaiSocket: WebSocket | null = null;
    let sessionConfigured = false;

    clientSocket.onopen = async () => {
      console.log('Client WebSocket connected');
      
      // Connect to OpenAI Realtime API
      console.log('Connecting to OpenAI Realtime API...');
      openaiSocket = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      openaiSocket.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
        clientSocket.send(JSON.stringify({ type: 'connected' }));
      };

      openaiSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('OpenAI event type:', data.type);

          // Configure session after receiving session.created
          if (data.type === 'session.created' && !sessionConfigured) {
            console.log('Session created, configuring...');
            sessionConfigured = true;
            
            const sessionConfig = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: `You are a psychiatric diagnostic assistant conducting a clinical interview. Your role is to:
1. Ask relevant questions to understand the patient's symptoms, history, and concerns
2. Listen carefully and ask follow-up questions
3. Be empathetic and professional
4. Help gather information needed for diagnostic assessment

Keep your responses concise and focused on gathering clinical information.`,
                voice: 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1'
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                temperature: 0.8,
                max_response_output_tokens: 'inf'
              }
            };

            openaiSocket?.send(JSON.stringify(sessionConfig));
            console.log('Session configuration sent');
          }

          // Forward relevant events to client
          if (
            data.type === 'response.audio.delta' ||
            data.type === 'response.audio.done' ||
            data.type === 'response.audio_transcript.delta' ||
            data.type === 'response.audio_transcript.done' ||
            data.type === 'conversation.item.input_audio_transcription.completed' ||
            data.type === 'input_audio_buffer.speech_started' ||
            data.type === 'input_audio_buffer.speech_stopped' ||
            data.type === 'response.created' ||
            data.type === 'response.done' ||
            data.type === 'error'
          ) {
            clientSocket.send(event.data);
          }
        } catch (error) {
          console.error('Error processing OpenAI message:', error);
        }
      };

      openaiSocket.onerror = (error) => {
        console.error('OpenAI WebSocket error:', error);
        clientSocket.send(JSON.stringify({ 
          type: 'error', 
          message: 'OpenAI connection error' 
        }));
      };

      openaiSocket.onclose = (event) => {
        console.log('OpenAI connection closed:', event.code, event.reason);
        clientSocket.send(JSON.stringify({ 
          type: 'disconnected',
          reason: event.reason || 'Connection closed'
        }));
        clientSocket.close();
      };
    };

    clientSocket.onmessage = (event) => {
      try {
        // Forward audio data and other messages to OpenAI
        if (openaiSocket?.readyState === WebSocket.OPEN) {
          openaiSocket.send(event.data);
        }
      } catch (error) {
        console.error('Error forwarding to OpenAI:', error);
      }
    };

    clientSocket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
    };

    clientSocket.onclose = () => {
      console.log('Client disconnected');
      openaiSocket?.close();
    };

    return response;
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
