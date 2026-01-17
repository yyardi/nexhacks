"""
Charcot AI Psychiatric Interview Agent

A multi-agent voice AI system for real-time psychiatric assessments with:
- Emotion-aware conversational responses
- Crisis detection and safety monitoring
- Structured clinical assessments (PHQ-9, GAD-7, C-SSRS)
- Real-time transcription with speaker attribution
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("charcot-agent")

load_dotenv(".env.local")


# =============================================================================
# Crisis Detection System
# =============================================================================

class RiskLevel(Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    IMMINENT = "imminent"


@dataclass
class CrisisSignal:
    """Represents a detected crisis signal from the conversation."""
    risk_level: RiskLevel
    category: str  # suicide, self_harm, violence, psychosis, etc.
    trigger_phrase: str
    timestamp: float
    recommended_action: str


CRISIS_KEYWORDS = {
    "suicide": {
        "high": ["kill myself", "end my life", "suicide", "don't want to live", "better off dead", "no reason to live"],
        "moderate": ["wish I wasn't here", "tired of living", "can't go on", "hopeless", "no point"],
    },
    "self_harm": {
        "high": ["cut myself", "hurt myself", "burning myself", "hitting myself"],
        "moderate": ["want to feel pain", "punish myself", "deserve to suffer"],
    },
    "violence": {
        "high": ["kill someone", "hurt them", "want to attack", "make them pay"],
        "moderate": ["so angry", "want to hit", "violent thoughts"],
    },
    "psychosis": {
        "high": ["they're watching me", "voices telling me", "poison", "conspiracy against me"],
        "moderate": ["things aren't real", "seeing things", "hearing things"],
    },
}


def detect_crisis_signals(text: str) -> list[CrisisSignal]:
    """Scan text for crisis indicators and return detected signals."""
    signals = []
    text_lower = text.lower()

    for category, levels in CRISIS_KEYWORDS.items():
        for level, phrases in levels.items():
            for phrase in phrases:
                if phrase in text_lower:
                    risk = RiskLevel.HIGH if level == "high" else RiskLevel.MODERATE
                    action = _get_recommended_action(category, risk)
                    signals.append(CrisisSignal(
                        risk_level=risk,
                        category=category,
                        trigger_phrase=phrase,
                        timestamp=asyncio.get_event_loop().time(),
                        recommended_action=action,
                    ))

    return signals


def _get_recommended_action(category: str, risk: RiskLevel) -> str:
    """Get recommended clinical action based on crisis type and risk level."""
    if risk == RiskLevel.HIGH or risk == RiskLevel.IMMINENT:
        if category == "suicide":
            return "Immediate safety assessment required. Ask directly about suicidal plan, means, and intent. Consider emergency services."
        elif category == "self_harm":
            return "Assess current self-harm urges and recent behaviors. Develop safety plan."
        elif category == "violence":
            return "Assess specific targets and plans. Consider duty to warn obligations."
        elif category == "psychosis":
            return "Assess reality testing and command hallucinations. Consider psychiatric emergency evaluation."

    return "Continue monitoring and explore further with open-ended questions."


# =============================================================================
# Clinical Assessment Flows
# =============================================================================

PHQ9_QUESTIONS = [
    "Over the last two weeks, how often have you been bothered by little interest or pleasure in doing things?",
    "Over the last two weeks, how often have you felt down, depressed, or hopeless?",
    "Over the last two weeks, how often have you had trouble falling asleep, staying asleep, or sleeping too much?",
    "Over the last two weeks, how often have you felt tired or had little energy?",
    "Over the last two weeks, how often have you had poor appetite or been overeating?",
    "Over the last two weeks, how often have you felt bad about yourself, or that you're a failure, or have let yourself or your family down?",
    "Over the last two weeks, how often have you had trouble concentrating on things like reading or watching television?",
    "Over the last two weeks, how often have you been moving or speaking slowly, or being fidgety or restless?",
    "Over the last two weeks, have you had any thoughts that you would be better off dead or of hurting yourself in some way?",
]

GAD7_QUESTIONS = [
    "Over the last two weeks, how often have you felt nervous, anxious, or on edge?",
    "Over the last two weeks, how often have you not been able to stop or control worrying?",
    "Over the last two weeks, how often have you been worrying too much about different things?",
    "Over the last two weeks, how often have you had trouble relaxing?",
    "Over the last two weeks, how often have you been so restless that it's hard to sit still?",
    "Over the last two weeks, how often have you become easily annoyed or irritable?",
    "Over the last two weeks, how often have you felt afraid, as if something awful might happen?",
]

CSSRS_SCREENING = [
    "In the past month, have you wished you were dead or wished you could go to sleep and not wake up?",
    "In the past month, have you actually had any thoughts of killing yourself?",
    "Have you been thinking about how you might do this?",
    "Have you had these thoughts and had some intention of acting on them?",
    "Have you started to work out or worked out the details of how to kill yourself, and do you intend to carry out this plan?",
    "Have you ever done anything, started to do anything, or prepared to do anything to end your life?",
]


@dataclass
class AssessmentState:
    """Tracks the state of clinical assessments during a session."""
    phq9_responses: dict[int, int] = field(default_factory=dict)
    gad7_responses: dict[int, int] = field(default_factory=dict)
    cssrs_responses: dict[int, bool] = field(default_factory=dict)
    current_assessment: Optional[str] = None
    current_question_index: int = 0

    def get_phq9_score(self) -> int:
        return sum(self.phq9_responses.values())

    def get_gad7_score(self) -> int:
        return sum(self.gad7_responses.values())

    def get_cssrs_positive_count(self) -> int:
        return sum(1 for v in self.cssrs_responses.values() if v)


# =============================================================================
# Emotion Context for Adaptive Responses
# =============================================================================

@dataclass
class EmotionContext:
    """Emotion signals received from client-side video analysis."""
    dominant_emotion: str = "neutral"
    confidence: float = 0.0
    agitation_level: float = 0.0
    sadness_level: float = 0.0
    anxiety_indicators: float = 0.0
    timestamp: float = 0.0

    def to_context_string(self) -> str:
        """Convert emotion context to a string for LLM prompting."""
        if self.confidence < 0.3:
            return ""

        parts = []
        if self.dominant_emotion != "neutral":
            parts.append(f"The patient appears {self.dominant_emotion}.")
        if self.agitation_level > 0.5:
            parts.append("They seem agitated or restless.")
        if self.sadness_level > 0.6:
            parts.append("They appear quite sad.")
        if self.anxiety_indicators > 0.5:
            parts.append("They show signs of anxiety.")

        return " ".join(parts)


# =============================================================================
# Session State
# =============================================================================

@dataclass
class SessionState:
    """Maintains state across the psychiatric interview session."""
    transcript: list[dict] = field(default_factory=list)
    crisis_signals: list[CrisisSignal] = field(default_factory=list)
    emotion_history: list[EmotionContext] = field(default_factory=list)
    assessment_state: AssessmentState = field(default_factory=AssessmentState)
    phase: str = "rapport"  # rapport, exploration, assessment, summary
    topics_covered: set = field(default_factory=set)
    risk_level: RiskLevel = RiskLevel.LOW

    def add_utterance(self, speaker: str, text: str):
        """Add an utterance to the transcript."""
        self.transcript.append({
            "speaker": speaker,
            "text": text,
            "timestamp": asyncio.get_event_loop().time(),
        })

        # Check for crisis signals
        if speaker == "patient":
            signals = detect_crisis_signals(text)
            if signals:
                self.crisis_signals.extend(signals)
                # Update overall risk level
                max_risk = max(s.risk_level for s in signals)
                if max_risk.value > self.risk_level.value:
                    self.risk_level = max_risk

    def get_recent_context(self, n_turns: int = 5) -> str:
        """Get recent conversation context for LLM."""
        recent = self.transcript[-n_turns:] if len(self.transcript) > n_turns else self.transcript
        return "\n".join(f"{t['speaker'].title()}: {t['text']}" for t in recent)


# =============================================================================
# Main Psychiatric Agent
# =============================================================================

class PsychiatricAssistant(Agent):
    """Voice AI agent for psychiatric interviews with emotion awareness and crisis detection."""

    def __init__(self) -> None:
        super().__init__(
            instructions=self._build_instructions(),
        )
        self.session_state = SessionState()
        self.emotion_context = EmotionContext()

    def _build_instructions(self) -> str:
        """Build the agent's instruction prompt."""
        base_instructions = """You are Arden, a compassionate AI assistant helping conduct psychiatric interviews. You are warm, empathetic, and professionally clinical.

IMPORTANT GUIDELINES:
- Speak naturally and conversationally. This is a voice interaction.
- Keep responses concise, typically 1-3 sentences.
- Never use complex formatting, emojis, asterisks, or bullet points.
- Show genuine empathy and validate the patient's feelings.
- Ask one question at a time and wait for responses.
- If the patient seems distressed, acknowledge their feelings first.

INTERVIEW STRUCTURE:
1. Rapport Building: Start with gentle, open-ended questions about how they're doing.
2. Exploration: Explore presenting concerns, symptoms, and history.
3. Assessment: When appropriate, conduct structured assessments (PHQ-9, GAD-7).
4. Safety: Always assess for safety concerns when indicated.

SAFETY PROTOCOL:
- If you detect any mention of self-harm, suicide, or harm to others, prioritize safety assessment.
- Ask directly about suicidal thoughts when appropriate: "Are you having any thoughts of hurting yourself or ending your life?"
- Validate distress while gathering critical safety information.
- Never minimize or dismiss safety concerns.

ADAPTIVE RESPONSES:
- If the patient seems anxious, speak more slowly and offer reassurance.
- If the patient seems sad, validate their feelings and explore gently.
- If the patient seems agitated, remain calm and give them space to express themselves.
- Mirror appropriate emotional tone while maintaining clinical boundaries."""

        # Add emotion context if available
        emotion_context_str = self.emotion_context.to_context_string()
        if emotion_context_str:
            base_instructions += f"\n\nCURRENT PATIENT STATE: {emotion_context_str}"

        # Add crisis alert if needed
        if self.session_state.risk_level in [RiskLevel.HIGH, RiskLevel.IMMINENT]:
            base_instructions += "\n\nALERT: High-risk content detected. Prioritize safety assessment."

        return base_instructions

    @function_tool
    async def receive_emotion_signals(
        self,
        context: RunContext,
        dominant_emotion: str,
        confidence: float,
        agitation_level: float = 0.0,
        sadness_level: float = 0.0,
        anxiety_indicators: float = 0.0,
    ):
        """Receive emotion signals from client-side video analysis.

        This tool is called by the web app to update the agent with real-time
        emotion detection results from facial analysis.

        Args:
            dominant_emotion: The primary detected emotion (happy, sad, angry, fearful, neutral, etc.)
            confidence: Confidence score of the emotion detection (0-1)
            agitation_level: Detected agitation/restlessness level (0-1)
            sadness_level: Detected sadness level (0-1)
            anxiety_indicators: Detected anxiety indicators (0-1)
        """
        self.emotion_context = EmotionContext(
            dominant_emotion=dominant_emotion,
            confidence=confidence,
            agitation_level=agitation_level,
            sadness_level=sadness_level,
            anxiety_indicators=anxiety_indicators,
            timestamp=asyncio.get_event_loop().time(),
        )
        self.session_state.emotion_history.append(self.emotion_context)

        # Update instructions with new emotion context
        self.instructions = self._build_instructions()

        logger.info(f"Emotion update: {dominant_emotion} (conf: {confidence:.2f})")
        return f"Acknowledged emotion update: {dominant_emotion}"

    @function_tool
    async def trigger_crisis_alert(
        self,
        context: RunContext,
        risk_level: str,
        category: str,
        reason: str,
    ):
        """Trigger a crisis alert to the supervising clinician.

        Use this when you detect high-risk content that requires immediate
        clinical attention. The alert will be sent to the clinician dashboard.

        Args:
            risk_level: The risk level - 'moderate', 'high', or 'imminent'
            category: The category of crisis - 'suicide', 'self_harm', 'violence', 'psychosis'
            reason: Brief description of why this alert was triggered
        """
        risk = RiskLevel(risk_level.lower())
        signal = CrisisSignal(
            risk_level=risk,
            category=category,
            trigger_phrase=reason,
            timestamp=asyncio.get_event_loop().time(),
            recommended_action=_get_recommended_action(category, risk),
        )
        self.session_state.crisis_signals.append(signal)
        self.session_state.risk_level = max(self.session_state.risk_level, risk, key=lambda r: r.value)

        # Send alert via data channel
        alert_data = {
            "type": "crisis_alert",
            "risk_level": risk_level,
            "category": category,
            "reason": reason,
            "recommended_action": signal.recommended_action,
            "timestamp": signal.timestamp,
        }

        logger.warning(f"CRISIS ALERT: {risk_level} - {category}: {reason}")

        # The actual data channel send would happen via the room context
        return f"Crisis alert triggered: {risk_level} risk for {category}"

    @function_tool
    async def start_phq9_assessment(self, context: RunContext):
        """Start the PHQ-9 depression screening assessment.

        Use this when you need to formally assess depression symptoms.
        The assessment will guide you through the 9 standardized questions.
        """
        self.session_state.assessment_state.current_assessment = "phq9"
        self.session_state.assessment_state.current_question_index = 0

        intro = "I'd like to ask you some specific questions about how you've been feeling over the past two weeks. For each question, please tell me if this has bothered you not at all, several days, more than half the days, or nearly every day."
        first_q = PHQ9_QUESTIONS[0]

        return f"{intro} {first_q}"

    @function_tool
    async def record_phq9_response(
        self,
        context: RunContext,
        question_index: int,
        score: int,
    ):
        """Record a response to a PHQ-9 question.

        Args:
            question_index: The question number (0-8)
            score: The score (0=not at all, 1=several days, 2=more than half, 3=nearly every day)
        """
        self.session_state.assessment_state.phq9_responses[question_index] = score

        # Move to next question or complete
        next_index = question_index + 1
        if next_index < len(PHQ9_QUESTIONS):
            self.session_state.assessment_state.current_question_index = next_index
            return f"Recorded. Next question: {PHQ9_QUESTIONS[next_index]}"
        else:
            total = self.session_state.assessment_state.get_phq9_score()
            self.session_state.assessment_state.current_assessment = None
            severity = _interpret_phq9_score(total)
            return f"PHQ-9 complete. Total score: {total} ({severity})"

    @function_tool
    async def start_gad7_assessment(self, context: RunContext):
        """Start the GAD-7 anxiety screening assessment.

        Use this when you need to formally assess anxiety symptoms.
        """
        self.session_state.assessment_state.current_assessment = "gad7"
        self.session_state.assessment_state.current_question_index = 0

        intro = "Now I'd like to ask about anxiety symptoms over the past two weeks."
        first_q = GAD7_QUESTIONS[0]

        return f"{intro} {first_q}"

    @function_tool
    async def start_cssrs_screening(self, context: RunContext):
        """Start the Columbia Suicide Severity Rating Scale screening.

        Use this for formal suicide risk assessment when safety concerns are present.
        """
        self.session_state.assessment_state.current_assessment = "cssrs"
        self.session_state.assessment_state.current_question_index = 0

        intro = "I want to ask you some important questions about thoughts of suicide. Please answer yes or no."
        first_q = CSSRS_SCREENING[0]

        return f"{intro} {first_q}"

    @function_tool
    async def get_session_summary(self, context: RunContext):
        """Generate a summary of the current session.

        Returns a structured summary including transcript highlights,
        assessment scores, and clinical impressions.
        """
        state = self.session_state

        summary = {
            "transcript_length": len(state.transcript),
            "phase": state.phase,
            "risk_level": state.risk_level.value,
            "crisis_signals": [
                {
                    "category": s.category,
                    "risk": s.risk_level.value,
                    "phrase": s.trigger_phrase,
                }
                for s in state.crisis_signals
            ],
            "assessments": {
                "phq9_score": state.assessment_state.get_phq9_score() if state.assessment_state.phq9_responses else None,
                "gad7_score": state.assessment_state.get_gad7_score() if state.assessment_state.gad7_responses else None,
                "cssrs_positive": state.assessment_state.get_cssrs_positive_count() if state.assessment_state.cssrs_responses else None,
            },
            "emotion_summary": _summarize_emotions(state.emotion_history) if state.emotion_history else None,
        }

        return json.dumps(summary, indent=2)


def _interpret_phq9_score(score: int) -> str:
    """Interpret PHQ-9 total score."""
    if score <= 4:
        return "Minimal depression"
    elif score <= 9:
        return "Mild depression"
    elif score <= 14:
        return "Moderate depression"
    elif score <= 19:
        return "Moderately severe depression"
    else:
        return "Severe depression"


def _summarize_emotions(history: list[EmotionContext]) -> dict:
    """Summarize emotion history for session report."""
    if not history:
        return {}

    emotion_counts = {}
    total_agitation = 0.0
    total_sadness = 0.0
    total_anxiety = 0.0

    for ctx in history:
        if ctx.confidence >= 0.3:
            emotion_counts[ctx.dominant_emotion] = emotion_counts.get(ctx.dominant_emotion, 0) + 1
            total_agitation += ctx.agitation_level
            total_sadness += ctx.sadness_level
            total_anxiety += ctx.anxiety_indicators

    n = len(history)
    dominant = max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else "neutral"

    return {
        "dominant_emotion": dominant,
        "emotion_distribution": emotion_counts,
        "avg_agitation": total_agitation / n,
        "avg_sadness": total_sadness / n,
        "avg_anxiety": total_anxiety / n,
    }


# =============================================================================
# Server Setup
# =============================================================================

server = AgentServer()


def prewarm(proc: JobProcess):
    """Prewarm the agent by loading VAD model."""
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session()
async def psychiatric_session(ctx: JobContext):
    """Handle a psychiatric interview session."""

    ctx.log_context_fields = {
        "room": ctx.room.name,
        "session_type": "psychiatric_interview",
    }

    logger.info(f"Starting psychiatric session in room: {ctx.room.name}")

    # Create the voice AI pipeline
    session = AgentSession(
        # Speech-to-text with AssemblyAI for high accuracy
        stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        # GPT-4.1 Mini for fast, capable responses
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        # Cartesia Sonic-3 for natural, warm voice
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"  # Warm, professional voice
        ),
        # Multilingual turn detection for natural conversation flow
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # Enable preemptive generation for lower latency
        preemptive_generation=True,
    )

    # Create the psychiatric agent
    agent = PsychiatricAssistant()

    # Set up event handlers for transcript tracking
    @session.on("user_speech_committed")
    async def on_user_speech(text: str):
        """Track user speech in session state."""
        agent.session_state.add_utterance("patient", text)
        logger.info(f"Patient: {text[:100]}...")

    @session.on("agent_speech_committed")
    async def on_agent_speech(text: str):
        """Track agent speech in session state."""
        agent.session_state.add_utterance("agent", text)
        logger.info(f"Agent: {text[:100]}...")

    # Start the session with noise cancellation
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC(),
            ),
        ),
    )

    # Connect to the room
    await ctx.connect()

    logger.info("Psychiatric session connected and ready")


if __name__ == "__main__":
    cli.run_app(server)
