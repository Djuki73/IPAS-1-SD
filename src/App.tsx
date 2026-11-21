/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BUILTIN_DURATION_SEC,
  DEFAULT_CHECKPOINTS,
  LESSON_SEGMENTS,
} from './data/pancaindraLesson';
import {
  AppMode,
  QuizCheckpoint,
  StudentAnswer,
  VideoSourceMode,
} from './types/lesson';
import {VideoStage} from './components/VideoStage';
import {CheckpointSidebar} from './components/CheckpointSidebar';
import {SenseReferenceDeck} from './components/SenseReferenceDeck';
import {CompletionSummary} from './components/CompletionSummary';
import {
  playCheckpointChime,
  playCompleteSound,
  playCorrectSound,
  playRetrySound,
} from './utils/soundEffects';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('student');
  const [videoSourceMode, setVideoSourceMode] = useState<VideoSourceMode>('builtin');
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string | null>(null);

  const [checkpoints, setCheckpoints] = useState<QuizCheckpoint[]>(DEFAULT_CHECKPOINTS);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(BUILTIN_DURATION_SEC);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const customUrlRef = useRef<string | null>(null);

  const sortedCheckpoints = useMemo(
    () => [...checkpoints].sort((a, b) => a.timestampSec - b.timestampSec),
    [checkpoints]
  );

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (customUrlRef.current) {
        URL.revokeObjectURL(customUrlRef.current);
      }
    };
  }, []);

  // Trigger mid-video checkpoint automatically when playback crosses timestampSec
  const handleTimeUpdate = useCallback(
    (nextTime: number) => {
      const prevTime = prevTimeRef.current;
      prevTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      if (!isPlaying || activeCheckpoint) return;

      const crossed = sortedCheckpoints.find((cp) => {
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
    [isPlaying, activeCheckpoint, sortedCheckpoints, answers, voiceEnabled]
  );

  const handleTogglePlay = () => {
    if (activeCheckpoint) return;
    if (currentTime >= duration - 0.2) {
      prevTimeRef.current = 0;
      setCurrentTime(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (targetTime: number) => {
    const clamped = Math.max(0, Math.min(duration, targetTime));
    prevTimeRef.current = clamped;
    setCurrentTime(clamped);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
  };

  const handleOpenCheckpoint = (cp: QuizCheckpoint) => {
    setIsPlaying(false);
    prevTimeRef.current = cp.timestampSec;
    setCurrentTime(cp.timestampSec);
    setActiveCheckpoint(cp);
    setLastAttemptResult(null);
    playCheckpointChime(voiceEnabled);
  };

  const handleJumpToCheckpoint = (cp: QuizCheckpoint) => {
    const previewStart = Math.max(0, cp.timestampSec - 3);
    prevTimeRef.current = previewStart;
    setCurrentTime(previewStart);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    setIsPlaying(true);
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
      const nextCorrectTotal = sortedCheckpoints.filter((item) =>
        item.id === cp.id ? true : Boolean(answers[item.id]?.isCorrect)
      ).length;
      if (nextCorrectTotal === sortedCheckpoints.length) {
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
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    const solvedCount = sortedCheckpoints.filter((cp) => answers[cp.id]?.isCorrect).length;
    if (solvedCount === sortedCheckpoints.length) {
      playCompleteSound(voiceEnabled);
    }
  };

  const handleRetryAll = () => {
    setAnswers({});
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    prevTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleStartFromTop = () => {
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    prevTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
    const stageEl = document.getElementById('video-interaktif');
    stageEl?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const handleWatchSegment = (startSec: number) => {
    setVideoSourceMode('builtin');
    setDuration(BUILTIN_DURATION_SEC);
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
    prevTimeRef.current = startSec;
    setCurrentTime(startSec);
    setIsPlaying(true);
    const stageEl = document.getElementById('video-interaktif');
    stageEl?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const handleAddCheckpoint = (newCp: QuizCheckpoint) => {
    setCheckpoints((prev) => [...prev, newCp]);
  };

  const handleDeleteCheckpoint = (id: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== id));
    if (activeCheckpoint?.id === id) {
      setActiveCheckpoint(null);
      setLastAttemptResult(null);
    }
  };

  const handleResetCheckpoints = () => {
    setCheckpoints(DEFAULT_CHECKPOINTS);
    setAnswers({});
    setActiveCheckpoint(null);
    setLastAttemptResult(null);
  };

  const handleUploadCustomVideo = (file: File) => {
    if (customUrlRef.current) {
      URL.revokeObjectURL(customUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    customUrlRef.current = url;
    setCustomVideoUrl(url);
    setCustomVideoName(file.name);
    setVideoSourceMode('custom');
    setIsPlaying(false);
    setActiveCheckpoint(null);
    prevTimeRef.current = 0;
    setCurrentTime(0);
  };

  const handleSwitchToBuiltin = () => {
    setVideoSourceMode('builtin');
    setDuration(BUILTIN_DURATION_SEC);
    setIsPlaying(false);
    setActiveCheckpoint(null);
    prevTimeRef.current = 0;
    setCurrentTime(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#video-interaktif"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            IndraKu
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#video-interaktif"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Video Interaktif
            </a>
            <a
              href="#ringkasan-indra"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Ringkasan Indra
            </a>
            <a
              href="#rapor-hasil"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Rapor Hasil
            </a>
            <a
              href="#panduan-guru"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Panduan Guru
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleStartFromTop}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Mulai Menonton
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Lesson Title + Workspace Mode Bar */}
        <section id="video-interaktif" className="scroll-mt-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
                <span>IPAS Kelas 1 SD</span>
                <span aria-hidden="true">·</span>
                <span>Kurikulum Merdeka</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {sortedCheckpoints.length} Soal di Tengah Video
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1.5 text-balance">
                Mengenal Pancaindra Manusia
              </h1>
            </div>

            {/* Interactive Mode Segmented Switch placed in Workspace Toolbar */}
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <div
                role="tablist"
                aria-label="Pilih mode tampilan"
                className="flex items-center p-1 bg-slate-200/75 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={appMode === 'student'}
                  onClick={() => setAppMode('student')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    appMode === 'student'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mode Siswa
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={appMode === 'teacher'}
                  onClick={() => setAppMode('teacher')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    appMode === 'teacher'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mode Guru (Edit Soal)
                </button>
              </div>
            </div>
          </div>

          {/* Two-Zone Sandbox Split Layout: 68% Stage / 32% Checkpoint Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <VideoStage
                segments={LESSON_SEGMENTS}
                checkpoints={sortedCheckpoints}
                answers={answers}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                voiceEnabled={voiceEnabled}
                showSubtitles={showSubtitles}
                videoSourceMode={videoSourceMode}
                customVideoUrl={customVideoUrl}
                activeCheckpoint={activeCheckpoint}
                lastAttemptResult={lastAttemptResult}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={setDuration}
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
              />
            </div>

            <div className="lg:col-span-4">
              <CheckpointSidebar
                appMode={appMode}
                checkpoints={sortedCheckpoints}
                answers={answers}
                currentTime={currentTime}
                duration={duration}
                activeCheckpointId={activeCheckpoint?.id ?? null}
                videoSourceMode={videoSourceMode}
                customVideoName={customVideoName}
                onJumpToCheckpoint={handleJumpToCheckpoint}
                onOpenCheckpointQuiz={handleOpenCheckpoint}
                onAddCheckpoint={handleAddCheckpoint}
                onDeleteCheckpoint={handleDeleteCheckpoint}
                onResetCheckpoints={handleResetCheckpoints}
                onSwitchToBuiltinVideo={handleSwitchToBuiltin}
                onUploadCustomVideo={handleUploadCustomVideo}
              />
            </div>
          </div>
        </section>

        {/* Completion & Score Report */}
        <CompletionSummary
          checkpoints={sortedCheckpoints}
          answers={answers}
          onRetryAll={handleRetryAll}
          onJumpToCheckpoint={handleOpenCheckpoint}
        />

        {/* 5 Pancaindra Quick Reference Deck */}
        <SenseReferenceDeck
          segments={LESSON_SEGMENTS}
          currentTime={currentTime}
          onWatchSegment={handleWatchSegment}
        />

        {/* Teacher Guide Section */}
        <section id="panduan-guru" className="pt-10 border-t border-slate-200 pb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-medium text-sky-700">Panduan Penggunaan</p>
            <h2 className="font-display text-2xl font-semibold text-slate-900 mt-1">
              Cara Kerja Video Interaktif Ini di Kelas
            </h2>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="font-display text-base font-semibold text-slate-900">
                  1. Pause & Answer Otomatis
                </p>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Video berhenti otomatis di titik soal (detik ke-16, 34, 52, 70, dan 88) dengan variasi Pilihan Ganda, Klik Objek di Video, dan Benar/Salah.
                </p>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-slate-900">
                  2. Putar Ulang Remedial
                </p>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Saat siswa menjawab belum tepat, tersedia tombol Putar Ulang Bagian Ini agar siswa meninjau kembali penjelasan indra terkait sebelum lanjut.
                </p>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-slate-900">
                  3. Pakai Video MP4 Sendiri
                </p>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Buka Mode Guru untuk mengunggah video MP4/WebM buatan sekolah dan menyisipkan soal baru di detik mana saja, lalu unduh format JSON-nya.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>IndraKu · Media Belajar Interaktif IPAS Kelas 1 SD</span>
          <span>Materi Pengenalan Pancaindra (Mata, Telinga, Hidung, Lidah, Kulit)</span>
        </div>
      </footer>
    </div>
  );
}
