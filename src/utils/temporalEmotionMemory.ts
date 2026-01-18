/**
 * Milestone 2: Temporal Emotion Memory
 * Prevents the system from repeatedly reacting to the same emotional state
 */

import { VisualObservation } from '@/types/overshoot';

const OBSERVATION_MEMORY = new Map<string, number>();
const MEMORY_WINDOW_MS = 60_000; // 60 seconds

/**
 * Checks if an observation is novel (hasn't been seen recently)
 * @param obs Visual observation to check
 * @returns true if the observation is novel, false if it's a duplicate
 */
export function isNovelObservation(obs: VisualObservation): boolean {
  // Create a unique key from significant observation fields
  // Group fields by category to detect meaningful state changes
  const key = [
    obs.emotion,
    obs.emotional_valence,
    obs.distress_signal,
    obs.gaze_direction,
    obs.posture,
    obs.hand_gestures
  ].join('|');

  const now = Date.now();

  // Check if we've seen this exact combination recently
  if (
    OBSERVATION_MEMORY.has(key) &&
    now - OBSERVATION_MEMORY.get(key)! < MEMORY_WINDOW_MS
  ) {
    return false; // Duplicate - suppress it
  }

  // This is novel - remember it
  OBSERVATION_MEMORY.set(key, now);
  return true;
}

/**
 * Clears old entries from memory to prevent unbounded growth
 */
export function pruneMemory(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  OBSERVATION_MEMORY.forEach((timestamp, key) => {
    if (now - timestamp > MEMORY_WINDOW_MS) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => OBSERVATION_MEMORY.delete(key));
}

/**
 * Resets the entire memory (useful for new sessions)
 */
export function resetMemory(): void {
  OBSERVATION_MEMORY.clear();
}

/**
 * Gets the current memory size (for debugging/monitoring)
 */
export function getMemorySize(): number {
  return OBSERVATION_MEMORY.size;
}
