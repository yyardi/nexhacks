/**
 * Overshoot Type Definitions for Arden
 * Milestone 1 & 2: Visual Observation and Temporal Memory
 */

export interface VisualObservation {
  timestamp: number;
  emotion: string | null;
  behavior: string | null;
  engagement: string | null;
  distress_signal: string | null;
}

export interface TemporalMemoryConfig {
  memoryWindowMs: number; // How long to remember observations (default: 60000ms)
}

export interface OvershotResult {
  result: string;
  inference_latency_ms: number;
  total_latency_ms: number;
}
