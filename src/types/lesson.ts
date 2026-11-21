export type SenseId = 'mata' | 'telinga' | 'hidung' | 'lidah' | 'kulit';

export type QuestionType = 'multiple-choice' | 'true-false' | 'hotspot';

export interface QuizOption {
  id: string;
  label: string;
}

export interface HotspotTarget {
  x: number; // Percentage 0..100
  y: number; // Percentage 0..100
  radius: number; // Percentage tolerance radius
  hintLabel: string;
}

export interface QuizCheckpoint {
  id: string;
  timestampSec: number;
  rewindToSec: number;
  senseId: SenseId;
  title: string;
  type: QuestionType;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  hotspotTarget?: HotspotTarget;
  explanation: string;
}

export interface NarrationLine {
  atSec: number;
  text: string;
}

export interface LessonSegment {
  id: string;
  senseId: SenseId;
  senseName: string;
  organName: string;
  title: string;
  subtitle: string;
  startSec: number;
  endSec: number;
  imageSrc: string;
  fallbackGradient: string;
  narrationLines: NarrationLine[];
  keyFact: string;
  careTip: string;
}

export interface StudentAnswer {
  checkpointId: string;
  selectedOptionId?: string;
  clickedPoint?: { x: number; y: number };
  isCorrect: boolean;
  attempts: number;
}

export type AppMode = 'student' | 'teacher';

export type VideoSourceMode = 'builtin' | 'custom';
