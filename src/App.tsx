/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useRef, useState} from 'react';
import {
  BUILTIN_DURATION_SEC,
  DEFAULT_CHECKPOINTS,
  LESSON_SEGMENTS,
} from './data/pancaindraLesson';
import {QuizCheckpoint, StudentAnswer} from './types/lesson';
import {VideoStage} from './components/VideoStage';
import {
  playCheckpointChime,
  playCompleteSound,
  playCorrectSound,
  playRetrySound,
} from './utils/soundEffects';

export default function App() {
  const checkpoints = DEFAULT_CHECKPOINTS;
  const duration = BUILTIN_DURATION_SEC;

  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const [activeCheckpoint, setActiveCheckpoint] = useState<QuizCheckpoint | null>(null);
  const [lastAttemptResult, setLastAttemptResult] = useState<{
    checkpointId: string;
    isCorrect: boolean;
    selectedOptionId?: string;
    clickedPoint?: {x: number; y: number};
  } | null>(null);

  const prevTimeRef = useRef(0);

  const handleTimeUpdate = useCallback(
    (nextTime: number) => {
      const prevTime = prevTimeRef.current;
      prevTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      if (!isPlaying || activeCheckpoint) return;

      const crossed = checkpoints.find((cp) => {
        const alreadySolved = Boolean(answers[cp.id]?.isCorrect);
        if (alreadySolved) return false;
        return prevTime < cp.timestampSec && nextTime >= cp.timestampSec;
      });

      if (crossed) {
        setIsPlaying(false);
        setCurrentTime(crossed.timestampSec);
        prevTimeRef.current = crossed.timestampSec;
        setActiveCheckpoint(crossed);
        setLastAttemptResult(null);
        playCheckpointChime(voiceEnabled);
      }
    },
    [isPlaying, activeCheckpoint, checkpoints, answers, voiceEnabled]
  );

  const handleTogglePlay = () => {
    if (activeCheckpoint) return;
    if (hasEnded || currentTime >= duration - 0.2) {
      prevTimeRef.current = 0;
      setCurrentTime(0);
      setHasEnded(false);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (targetTime: number) => {
    const clamped = Math.max(0, Math.min(duration, targetTime));
    prevTimeRef.current = clamped;
    setCurrentTime(clamped);
    setHasEnded(false);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
  };

  const handleJumpToSegment = (startSec: number) => {
    prevTimeRef.current = startSec;
    setCurrentTime(startSec);
    setHasEnded(false);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    setIsPlaying(true);
  };

  const handleOpenCheckpoint = (cp: QuizCheckpoint) => {
    setIsPlaying(false);
    setHasEnded(false);
    prevTimeRef.current = cp.timestampSec;
    setCurrentTime(cp.timestampSec);
    setActiveCheckpoint(cp);
    setLastAttemptResult(null);
    playCheckpointChime(voiceEnabled);
  };

  const handleSubmitOption = (cp: QuizCheckpoint, optionId: string) => {
    const isCorrect = optionId === cp.correctOptionId;
    const prevAttempts = answers[cp.id]?.attempts ?? 0;

    setAnswers((prev) => ({
      ...prev,
      [cp.id]: {
        checkpointId: cp.id,
        selectedOptionId: optionId,
        isCorrect: isCorrect || Boolean(prev[cp.id]?.isCorrect),
        attempts: prevAttempts + 1,
      },
    }));

    setLastAttemptResult({
      checkpointId: cp.id,
      isCorrect,
      selectedOptionId: optionId,
    });

    if (isCorrect) {
      const nextCorrectTotal = checkpoints.filter((item) =>
        item.id === cp.id ? true : Boolean(answers[item.id]?.isCorrect)
      ).length;
      if (nextCorrectTotal === checkpoints.length) {
        playCompleteSound(voiceEnabled);
      } else {
        playCorrectSound(voiceEnabled);
      }
    } else {
      playRetrySound(voiceEnabled);
    }
  };

  const handleSubmitHotspot = (cp: QuizCheckpoint, xPct: number, yPct: number) => {
    if (!cp.hotspotTarget) return;
    const dx = xPct - cp.hotspotTarget.x;
    const dy = yPct - cp.hotspotTarget.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const isCorrect = distance <= cp.hotspotTarget.radius;
    const prevAttempts = answers[cp.id]?.attempts ?? 0;

    setAnswers((prev) => ({
      ...prev,
      [cp.id]: {
        checkpointId: cp.id,
        clickedPoint: {x: xPct, y: yPct},
        isCorrect: isCorrect || Boolean(prev[cp.id]?.isCorrect),
        attempts: prevAttempts + 1,
      },
    }));

    setLastAttemptResult({
      checkpointId: cp.id,
      isCorrect,
      clickedPoint: {x: xPct, y: yPct},
    });

    if (isCorrect) {
      playCorrectSound(voiceEnabled);
    } else {
      playRetrySound(voiceEnabled);
    }
  };

  const handleRewindForCheckpoint = (cp: QuizCheckpoint) => {
    const target = Math.max(0, cp.rewindToSec);
    prevTimeRef.current = target;
    setCurrentTime(target);
    setHasEnded(false);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    setIsPlaying(true);
  };

  const handleContinueAfterQuiz = () => {
    if (!activeCheckpoint) return;
    const resumeAt = Math.min(duration, activeCheckpoint.timestampSec + 0.35);
    prevTimeRef.current = resumeAt;
    setCurrentTime(resumeAt);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    if (resumeAt < duration) {
      setIsPlaying(true);
    } else {
      setHasEnded(true);
    }
  };

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    setHasEnded(true);
    playCompleteSound(voiceEnabled);
  }, [voiceEnabled]);

  const handleRetryAll = () => {
    setAnswers({});
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    setHasEnded(false);
    prevTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const solvedCount = checkpoints.filter((cp) => answers[cp.id]?.isCorrect).length;
  const activeSegment =
    LESSON_SEGMENTS.find((s) => currentTime >= s.startSec && currentTime < s.endSec) ??
    LESSON_SEGMENTS[LESSON_SEGMENTS.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Clean 3-Zone Top Bar: Brand — 5 Chapter Links — 1 Primary Action */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => handleJumpToSegment(0)}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            IndraKu
          </button>

          <nav
            aria-label="Bagian materi pancaindra"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            {LESSON_SEGMENTS.map((seg) => {
              const isCurrent = activeSegment?.id === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => handleJumpToSegment(seg.startSec)}
                  className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer hover:text-slate-900 hover:underline underline-offset-4 ${
                    isCurrent ? 'text-sky-700 font-semibold underline underline-offset-4' : ''
                  }`}
                >
                  {seg.organName}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleRetryAll}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ulangi Video
            </button>
          </div>
        </div>
      </header>

      {/* Focused Single-Theme Interactive Video Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
              <span>IPAS Kelas 1 SD</span>
              <span aria-hidden="true">·</span>
              <span>Pengenalan Pancaindra</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5 text-balance">
              Mengenal Pancaindra Manusia
            </h1>
          </div>

          <p className="font-mono text-xs sm:text-sm tabular-nums text-slate-600">
            Soal Selesai: {solvedCount} dari {checkpoints.length}
          </p>
        </div>

        <VideoStage
          segments={LESSON_SEGMENTS}
          checkpoints={checkpoints}
          answers={answers}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          hasEnded={hasEnded}
          playbackRate={playbackRate}
          voiceEnabled={voiceEnabled}
          showSubtitles={showSubtitles}
          activeCheckpoint={activeCheckpoint}
          lastAttemptResult={lastAttemptResult}
          onTimeUpdate={handleTimeUpdate}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onPlaybackRateChange={setPlaybackRate}
          onToggleVoice={() => setVoiceEnabled((v) => !v)}
          onToggleSubtitles={() => setShowSubtitles((v) => !v)}
          onOpenCheckpoint={handleOpenCheckpoint}
          onSubmitOption={handleSubmitOption}
          onSubmitHotspot={handleSubmitHotspot}
          onRewindForCheckpoint={handleRewindForCheckpoint}
          onContinueAfterQuiz={handleContinueAfterQuiz}
          onVideoEnded={handleVideoEnded}
          onRetryAll={handleRetryAll}
        />

        <p className="mt-3 text-center text-xs text-slate-500">
          Video akan berhenti otomatis pada angka 1 sampai 5 di garis waktu untuk memunculkan kuis.
        </p>
      </main>
    </div>
  );
}
