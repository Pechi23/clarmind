// 7-day micro-courses. Day content is AI-generated on demand and cached.
export interface CourseDef {
  id: string;
  emoji: string;
  color: string;
  theme: string; // used in the AI prompt to shape each day's content
}

export const COURSES: CourseDef[] = [
  {
    id: 'letting-go',
    emoji: '🍃',
    color: '#6BCB77',
    theme: 'letting go of stress, control, and the need to hold everything together',
  },
  {
    id: 'better-sleep',
    emoji: '🌙',
    color: '#7dd3fc',
    theme: 'winding down, calming a busy mind, and preparing body and mind for deep sleep',
  },
  {
    id: 'finding-focus',
    emoji: '🎯',
    color: '#a78bfa',
    theme: 'building clarity, single-tasking, and a calm, focused mind',
  },
];

export interface CourseDayContent {
  title: string;
  intro: string;
  practice: string;
  reflection: string;
}
