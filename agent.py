import asyncio
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
