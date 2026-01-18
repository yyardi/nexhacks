/**
 * Overshoot Type Definitions for Arden
 * Milestone 1 & 2: Visual Observation and Temporal Memory
 * Enhanced with complete biometric measurements
 */

export interface VisualObservation {
  timestamp: number;

  // Emotional state
  emotion: string | null;
  behavior: string | null;
  distress_signal: string | null;

  // Biometric measurements (extracted from visual analysis)
  eye_contact: number | null;        // 0-100 percentage
  gaze_stability: number | null;     // 0-100 percentage
  breathing_rate: number | null;     // breaths per minute
  blink_rate: number | null;         // blinks per minute
  engagement_level: number | null;   // 0-100 percentage

  // Descriptive engagement (legacy field for compatibility)
  engagement: string | null;
}

export interface TemporalMemoryConfig {
  memoryWindowMs: number; // How long to remember observations (default: 60000ms)
}

export interface OvershotResult {
  result: string;
  inference_latency_ms: number;
  total_latency_ms: number;
}
