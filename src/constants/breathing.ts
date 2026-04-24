import { BreathingPatternId } from '../types';

export interface BreathingPhase {
  label: string;
  duration: number; // seconds
  scale: number;    // circle scale target
}

export interface BreathingPattern {
  id: BreathingPatternId;
  name: string;
  description: string;
  totalCycle: number; // seconds per full cycle
  phases: BreathingPhase[];
  color: string;
}

export const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: '4-4-4-4 · For focus and calm',
    totalCycle: 16,
    color: '#a78bfa',
    phases: [
      { label: 'Breathe in',  duration: 4, scale: 1.6 },
      { label: 'Hold',        duration: 4, scale: 1.6 },
      { label: 'Breathe out', duration: 4, scale: 1.0 },
      { label: 'Hold',        duration: 4, scale: 1.0 },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Sleep',
    description: '4-7-8 · Falls asleep faster',
    totalCycle: 19,
    color: '#7dd3fc',
    phases: [
      { label: 'Breathe in',  duration: 4, scale: 1.6 },
      { label: 'Hold',        duration: 7, scale: 1.6 },
      { label: 'Breathe out', duration: 8, scale: 1.0 },
    ],
  },
  {
    id: 'deepCalm',
    name: 'Deep Calm',
    description: '5-2-5 · Steady relaxation',
    totalCycle: 12,
    color: '#fda4af',
    phases: [
      { label: 'Breathe in',  duration: 5, scale: 1.6 },
      { label: 'Hold',        duration: 2, scale: 1.6 },
      { label: 'Breathe out', duration: 5, scale: 1.0 },
    ],
  },
];

export const PRESET_DURATIONS = [2, 5, 10, 20]; // minutes
