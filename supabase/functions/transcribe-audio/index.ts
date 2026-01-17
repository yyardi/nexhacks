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

  const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!ASSEMBLYAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    let assemblySocket: WebSocket | null = null;
    let isReady = false;

    clientSocket.onopen = async () => {
      console.log('Client connected');
      
      try {
        console.log('Getting temporary token from AssemblyAI...');
        const tokenResponse = await fetch(
          'https://streaming.assemblyai.com/v3/token?expires_in_seconds=300',
          {
            method: 'GET',
            headers: { 'Authorization': ASSEMBLYAI_API_KEY }
          }
        );

        if (!tokenResponse.ok) {
          throw new Error(`Token request failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const tempToken = tokenData.token;
        console.log('Got temporary token');

        const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&format_turns=true&token=${encodeURIComponent(tempToken)}`;
        console.log('Connecting to AssemblyAI with format_turns enabled...');
        
        assemblySocket = new WebSocket(wsUrl);

        assemblySocket.onopen = () => {
          console.log('Connected to AssemblyAI - session ready');
          isReady = true;
          clientSocket.send(JSON.stringify({ type: 'connected' }));
        };

        assemblySocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('AssemblyAI message:', JSON.stringify(data));
            
            if (data.error) {
              console.error('AssemblyAI error:', data.error);
            }
            
            // Forward all messages to client
            clientSocket.send(event.data);
          } catch (error) {
            console.error('Parse error:', error);
          }
        };

        assemblySocket.onerror = (error) => {
          console.error('AssemblyAI error:', error);
          isReady = false;
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Connection error' }));
        };

        assemblySocket.onclose = (event) => {
          console.log('AssemblyAI closed:', event.code, event.reason);
          isReady = false;
          clientSocket.close();
        };

      } catch (error) {
        console.error('Setup error:', error);
        clientSocket.send(JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Connection failed'
        }));
        clientSocket.close();
      }
    };

    clientSocket.onmessage = (event) => {
      if (!assemblySocket || assemblySocket.readyState !== WebSocket.OPEN) {
        console.log('AssemblyAI not connected, dropping message');
        return;
      }
      
      if (!isReady) {
        console.log('Session not ready, dropping message');
        return;
      }
      
      // Forward raw binary audio data to AssemblyAI
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        assemblySocket.send(event.data);
      } else if (typeof event.data === 'string') {
        // Handle JSON control messages
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'Terminate') {
            assemblySocket.send(JSON.stringify({ type: 'Terminate' }));
          }
        } catch (e) {
          console.log('Received non-JSON string, ignoring');
        }
      }
    };

    clientSocket.onclose = () => {
      console.log('Client disconnected');
      if (assemblySocket?.readyState === WebSocket.OPEN) {
        assemblySocket.send(JSON.stringify({ type: 'Terminate' }));
        assemblySocket.close();
      }
    };

    return response;
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
