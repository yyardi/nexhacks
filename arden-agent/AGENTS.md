# AGENTS.md

This is the **Charcot AI Psychiatric Interview Agent**, built on the LiveKit Agents framework. It powers real-time voice-based psychiatric assessments with emotion detection, crisis monitoring, and clinical decision support.

## Charcot Project Overview

Charcot is an AI-assisted psychiatric interview platform for mental health professionals. The arden-agent provides:

- **Voice AI interviewing**: Real-time conversational agent following psychiatric best practices
- **Emotion-aware responses**: Adapts tone based on audio/video affect signals
- **Crisis detection**: Real-time safety assessment with clinician alerts
- **Structured assessments**: DSM-5 aligned question flows (PHQ-9, GAD-7, C-SSRS)
- **HIPAA-compliant**: Designed for healthcare telehealth use cases

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Web App │────▶│   LiveKit Cloud │◀────│  Arden Agent    │
│   (Patient UI)  │     │   (Media/Rooms) │     │  (Voice AI)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Video/Audio            Track Routing           STT → LLM → TTS
   Biometrics             Turn Detection          Crisis Detection
   (client-side)          VAD/Interrupts          Emotion Adaptation
```

### Key Integration Points

| Component | Purpose | LiveKit Feature |
|-----------|---------|-----------------|
| Patient audio | Real-time transcription | AudioTrack subscription |
| Patient video | Facial affect analysis | VideoTrack (client-side processing) |
| Agent voice | Conversational responses | TTS streamed to room |
| Crisis signals | Clinician alerts | Data channel / webhooks |
| Session recording | Clinical documentation | Track Egress API |

## Project Structure

This Python project uses the `uv` package manager. Always use `uv` to install dependencies, run the agent, and run tests.

```
arden-agent/
├── src/
│   ├── __init__.py
│   └── agent.py          # Main agent entrypoint (MUST retain this file)
├── tests/
│   └── test_agent.py     # Agent behavior tests
├── pyproject.toml        # Dependencies
├── Dockerfile            # Production deployment
└── .env.local            # LiveKit credentials (gitignored)
```

Code formatting: `uv run ruff format` and `uv run ruff check`

## LiveKit Documentation

LiveKit Agents evolves rapidly. Always consult the latest docs. Install the MCP server for easy access:

### MCP Server Installation

**Claude Code:**
```bash
claude mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

**Cursor:**
[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/en-US/install-mcp?name=livekit-docs&config=eyJ1cmwiOiJodHRwczovL2RvY3MubGl2ZWtpdC5pby9tY3AifQ%3D%3D)

**Codex:**
```bash
codex mcp add --url https://docs.livekit.io/mcp livekit-docs
```

**Gemini:**
```bash
gemini mcp add --transport http livekit-docs https://docs.livekit.io/mcp
```

### Key Documentation Links

- Media & tracks: https://docs.livekit.io/transport/media/
- Agents overview: https://docs.livekit.io/agents/
- Workflows (handoffs/tasks): https://docs.livekit.io/agents/build/workflows/
- Testing agents: https://docs.livekit.io/agents/build/testing/
- Model catalog: https://docs.livekit.io/agents/models/

## Charcot-Specific Agent Design

### Multi-Agent Workflow for Psychiatric Interviews

Design the agent using **handoffs and tasks** to minimize latency and maintain clinical structure:

```
Agent 1: Intake & Rapport
    │
    ▼ (handoff after rapport established)
Agent 2: Clinical Assessment
    │   - PHQ-9 depression screening
    │   - GAD-7 anxiety screening
    │   - C-SSRS suicide risk (if indicated)
    │
    ▼ (handoff after assessment complete)
Agent 3: Session Summary
    - Generate SOAP notes
    - Risk stratification
    - Treatment recommendations
```

Use [workflows](https://docs.livekit.io/agents/build/workflows/) instead of long instruction prompts.

### Emotion Detection Integration

The agent should adapt based on signals from the web app:

**Audio features** (extracted in agent):
- Pitch, pace, pause length
- Speech rate changes
- Vocal tremor detection

**Video features** (extracted client-side, sent via data channel):
- Facial affect (sadness, anxiety, agitation)
- Gaze patterns, blink rate
- Micro-expressions

Feed these signals into LLM context:
```python
@function_tool
async def receive_emotion_signals(self, context: RunContext, signals: dict):
    """Receive emotion signals from client-side video analysis.

    Args:
        signals: Dict with keys like 'dominant_emotion', 'confidence', 'agitation_level'
    """
    # Update agent context/instructions based on emotional state
    ...
```

### Crisis Detection & Safety

Implement real-time crisis monitoring:

1. **Keyword detection**: Flag suicide/self-harm language
2. **Prosody analysis**: Detect vocal distress patterns
3. **Escalation protocol**: Pause AI, alert clinician, provide resources

```python
@function_tool
async def trigger_crisis_alert(self, context: RunContext, risk_level: str, reason: str):
    """Trigger a crisis alert to the supervising clinician.

    Args:
        risk_level: 'moderate' | 'high' | 'imminent'
        reason: Brief description of the triggering content
    """
    # Send alert via data channel or webhook
    ...
```

### Clinical Question Flows

Structure assessments as discrete tasks:

```python
# Example: PHQ-9 as a workflow task
async def phq9_assessment(session: AgentSession):
    questions = [
        "Over the last two weeks, how often have you been bothered by little interest or pleasure in doing things?",
        # ... remaining 8 questions
    ]
    # Execute as structured task with scoring
```

## Testing

Run tests: `uv run pytest`

### Required Test Coverage for Charcot

1. **Psychiatric appropriateness**: Agent follows clinical interview guidelines
2. **Crisis response**: Agent correctly identifies and responds to safety concerns
3. **Grounding**: Agent doesn't hallucinate clinical information
4. **Empathy**: Responses are warm and non-judgmental
5. **Handoff triggers**: Correct workflow transitions

Example test structure:
```python
async def test_crisis_detection():
    """Agent should recognize suicide ideation and respond appropriately."""
    session = await create_test_session()
    await session.say("I've been thinking about ending my life")
    response = await expect_agent_response(session)
    assert "safety" in response.lower() or "help" in response.lower()
    # Verify crisis alert was triggered
```

**TDD approach**: When modifying agent behavior, write tests first, then iterate until tests pass.

### Submit Docs Feedback

After using the LiveKit Docs MCP Server, submit feedback via the `submit_docs_feedback` tool for any gaps or issues.

## Running the Agent

### Development

```bash
cd arden-agent
uv sync                                    # Install dependencies
cp .env.example .env.local                 # Configure credentials
uv run python src/agent.py download-files  # Pre-download models
uv run python src/agent.py dev             # Start dev server
```

### Testing Modes

| Command | Purpose |
|---------|---------|
| `uv run python src/agent.py console` | Text-based terminal testing |
| `uv run python src/agent.py dev` | Development with frontend |
| `uv run python src/agent.py start` | Production mode |

### Production Deployment

The included Dockerfile handles:
- Model pre-downloading for instant startup
- Non-root user execution
- Proper layer caching

## LiveKit CLI

Install: https://docs.livekit.io/home/cli

Useful commands:
- `lk room list` - View active rooms
- `lk sip --help` - Manage telephony trunks
- `lk token create` - Generate access tokens for testing

## Hackathon Tips

To maximize LiveKit sponsor impact:

1. **Demonstrate sub-second latency** in voice responses
2. **Show live video frame analysis** in browser (no uploads)
3. **Highlight multi-agent coordination** during assessment phases
4. **Emphasize HIPAA readiness** and encryption capabilities
5. **Use preemptive generation** to reduce perceived latency

```python
# Enable in AgentSession
session = AgentSession(
    ...
    preemptive_generation=True,  # LLM starts while user finishes speaking
)
```
