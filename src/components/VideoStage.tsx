import React, {useEffect, useRef, useState} from 'react';
import {
  CheckCircle2,
  Eye,
  Hand,
  Headphones,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Wind,
  Utensils,
} from 'lucide-react';
import {
  LessonSegment,
  QuizCheckpoint,
  SenseId,
  StudentAnswer,
  VideoSourceMode,
} from '../types/lesson';
import {formatTimestamp, getQuestionTypeLabel, getSenseLabel} from '../utils/timeFormat';

interface VideoStageProps {
  segments: LessonSegment[];
  checkpoints: QuizCheckpoint[];
  answers: Record<string, StudentAnswer>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  voiceEnabled: boolean;
  showSubtitles: boolean;
  videoSourceMode: VideoSourceMode;
  customVideoUrl: string | null;
  activeCheckpoint: QuizCheckpoint | null;
  lastAttemptResult: {
    checkpointId: string;
    isCorrect: boolean;
    selectedOptionId?: string;
    clickedPoint?: {x: number; y: number};
  } | null;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleVoice: () => void;
  onToggleSubtitles: () => void;
  onOpenCheckpoint: (checkpoint: QuizCheckpoint) => void;
  onSubmitOption: (checkpoint: QuizCheckpoint, optionId: string) => void;
  onSubmitHotspot: (checkpoint: QuizCheckpoint, xPct: number, yPct: number) => void;
  onRewindForCheckpoint: (checkpoint: QuizCheckpoint) => void;
  onContinueAfterQuiz: () => void;
  onVideoEnded: () => void;
}

function getSenseIcon(senseId: SenseId, className = 'w-5 h-5') {
  switch (senseId) {
    case 'mata':
      return <Eye className={className} />;
    case 'telinga':
      return <Headphones className={className} />;
    case 'hidung':
      return <Wind className={className} />;
    case 'lidah':
      return <Utensils className={className} />;
    case 'kulit':
      return <Hand className={className} />;
  }
}

export const VideoStage: React.FC<VideoStageProps> = ({
  segments,
  checkpoints,
  answers,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  voiceEnabled,
  showSubtitles,
  videoSourceMode,
  customVideoUrl,
  activeCheckpoint,
  lastAttemptResult,
  onTimeUpdate,
  onDurationChange,
  onTogglePlay,
  onSeek,
  onPlaybackRateChange,
  onToggleVoice,
  onToggleSubtitles,
  onOpenCheckpoint,
  onSubmitOption,
  onSubmitHotspot,
  onRewindForCheckpoint,
  onContinueAfterQuiz,
  onVideoEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageImageRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenKeyRef = useRef<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [showHotspotTextFallback, setShowHotspotTextFallback] = useState(false);

  const currentSegment =
    segments.find((s) => currentTime >= s.startSec && currentTime < s.endSec) ??
    segments[segments.length - 1];

  const currentNarration = (() => {
    if (!currentSegment) return null;
    const lines = currentSegment.narrationLines;
    let activeLine = lines[0];
    for (const line of lines) {
      if (currentTime >= line.atSec) {
        activeLine = line;
      }
    }
    return activeLine;
  })();

  // Sync built-in animation timer
  useEffect(() => {
    if (videoSourceMode !== 'builtin' || !isPlaying || activeCheckpoint) return;

    let rafId = 0;
    let lastTs = performance.now();
    let localTime = currentTime;

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      localTime = Math.min(duration, localTime + dt * playbackRate);
      onTimeUpdate(localTime);

      if (localTime >= duration) {
        onVideoEnded();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoSourceMode, isPlaying, playbackRate, duration, activeCheckpoint]);

  // Sync HTML5 <video> element when custom MP4/WebM is used
  useEffect(() => {
    if (videoSourceMode !== 'custom' || !videoRef.current) return;
    const vid = videoRef.current;
    vid.playbackRate = playbackRate;
    if (isPlaying && !activeCheckpoint) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [videoSourceMode, isPlaying, playbackRate, activeCheckpoint, customVideoUrl]);

  // Keep native video seeked when currentTime changes externally
  useEffect(() => {
    if (videoSourceMode !== 'custom' || !videoRef.current) return;
    const vid = videoRef.current;
    if (Math.abs(vid.currentTime - currentTime) > 0.6) {
      vid.currentTime = currentTime;
    }
  }, [currentTime, videoSourceMode]);

  // Indonesian Web Speech API Narration for built-in video
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (videoSourceMode !== 'builtin' || !isPlaying || !voiceEnabled || activeCheckpoint) {
      window.speechSynthesis.cancel();
      if (!isPlaying || activeCheckpoint) {
        lastSpokenKeyRef.current = null;
      }
      return;
    }

    if (!currentNarration || !currentSegment) return;
    const key = `${currentSegment.id}:${currentNarration.atSec}`;
    if (lastSpokenKeyRef.current === key) return;

    lastSpokenKeyRef.current = key;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentNarration.text);
    utterance.lang = 'id-ID';
    utterance.rate = Math.min(1.25, Math.max(0.8, playbackRate));
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [
    videoSourceMode,
    isPlaying,
    voiceEnabled,
    activeCheckpoint,
    currentNarration,
    currentSegment,
    playbackRate,
  ]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Reset hotspot text fallback state when checkpoint changes
  useEffect(() => {
    setShowHotspotTextFallback(false);
  }, [activeCheckpoint?.id]);

  const handleStageClickForHotspot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeCheckpoint || activeCheckpoint.type !== 'hotspot') return;
    if (lastAttemptResult?.checkpointId === activeCheckpoint.id && lastAttemptResult.isCorrect) return;
    if (!stageImageRef.current) return;

    const rect = stageImageRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onSubmitHotspot(activeCheckpoint, xPct, yPct);
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const isCheckpointAnsweredCorrect = activeCheckpoint
    ? Boolean(answers[activeCheckpoint.id]?.isCorrect)
    : false;

  const showResultForActive =
    activeCheckpoint &&
    lastAttemptResult &&
    lastAttemptResult.checkpointId === activeCheckpoint.id;

  const rates = [0.75, 1, 1.25];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* 16:9 Interactive Video Canvas */}
      <div
        ref={stageImageRef}
        onClick={
          activeCheckpoint?.type === 'hotspot' ? handleStageClickForHotspot : undefined
        }
        className={`relative aspect-video w-full bg-slate-900 overflow-hidden select-none ${
          activeCheckpoint?.type === 'hotspot' && !isCheckpointAnsweredCorrect
            ? 'cursor-crosshair'
            : ''
        }`}
      >
        {videoSourceMode === 'custom' && customVideoUrl ? (
          <video
            ref={videoRef}
            src={customVideoUrl}
            className="w-full h-full object-contain bg-black"
            muted={!voiceEnabled}
            playsInline
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) {
                onDurationChange(d);
              }
            }}
            onTimeUpdate={(e) => {
              onTimeUpdate(e.currentTarget.currentTime);
            }}
            onEnded={onVideoEnded}
          />
        ) : (
          currentSegment && (
            <div className="relative w-full h-full">
              {!failedImages[currentSegment.id] ? (
                <img
                  key={currentSegment.id}
                  src={currentSegment.imageSrc}
                  alt={`${currentSegment.organName} — ${currentSegment.subtitle}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({...prev, [currentSegment.id]: true}))
                  }
                  className={`w-full h-full object-cover video-ken-burns ${
                    !isPlaying || activeCheckpoint ? 'video-ken-burns-paused' : ''
                  }`}
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${currentSegment.fallbackGradient} flex flex-col items-center justify-center p-8 text-center`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/90 border border-slate-200 flex items-center justify-center text-sky-700 mb-3">
                    {getSenseIcon(currentSegment.senseId, 'w-8 h-8')}
                  </div>
                  <p className="font-display text-2xl font-semibold text-slate-900">
                    {currentSegment.title}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 max-w-md">
                    {currentSegment.subtitle}
                  </p>
                </div>
              )}

              {/* Subtle top-left chapter title scrim when playing */}
              {!activeCheckpoint && (
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-slate-950/70 via-slate-950/25 to-transparent p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="text-white">
                    <p className="text-xs font-medium text-sky-200 tracking-wide">
                      {currentSegment.senseName}
                    </p>
                    <h2 className="font-display text-lg sm:text-xl font-semibold leading-snug">
                      {currentSegment.title}
                    </h2>
                  </div>
                  <div className="font-mono text-xs tabular-nums text-white/90 bg-slate-950/60 px-2.5 py-1 rounded-md">
                    {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
                  </div>
                </div>
              )}

              {/* Subtitle / Narration Bar */}
              {showSubtitles && currentNarration && !activeCheckpoint && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/50 to-transparent pt-12 pb-4 px-4 sm:px-6 flex justify-center">
                  <p className="max-w-2xl text-center text-sm sm:text-base font-medium text-white leading-relaxed drop-shadow-sm">
                    {currentNarration.text}
                  </p>
                </div>
              )}

              {/* Initial Center Play Prompt if paused at 0:00 and no active quiz */}
              {!isPlaying && currentTime < 0.5 && !activeCheckpoint && (
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label="Mulai putar video pembelajaran"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/35 hover:bg-slate-950/45 transition-colors cursor-pointer group"
                >
                  <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-600 group-hover:bg-sky-500 text-white flex items-center justify-center shadow-lg transition-transform duration-150 group-hover:scale-105">
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  </span>
                  <span className="mt-3 px-4 py-1.5 rounded-lg bg-slate-950/80 text-white text-sm font-medium">
                    Putar Video Pelajaran (01:30)
                  </span>
                </button>
              )}
            </div>
          )
        )}

        {/* HOTSPOT QUIZ OVERLAY (keeps scene visible & clickable!) */}
        {activeCheckpoint && activeCheckpoint.type === 'hotspot' && (
          <>
            {/* Top prompt banner */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 top-0 bg-slate-950/88 text-white p-4 sm:px-6 sm:py-4 border-b border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-200 mb-1">
                <span>
                  {activeCheckpoint.title} · {getQuestionTypeLabel(activeCheckpoint.type)}
                </span>
                <span className="font-mono tabular-nums">
                  Berhenti di {formatTimestamp(activeCheckpoint.timestampSec)}
                </span>
              </div>
              <p className="font-display text-base sm:text-lg font-semibold leading-snug text-white">
                {activeCheckpoint.prompt}
              </p>
            </div>

            {/* Clicked visual marker */}
            {showResultForActive && lastAttemptResult.clickedPoint && (
              <div
                style={{
                  left: `${lastAttemptResult.clickedPoint.x}%`,
                  top: `${lastAttemptResult.clickedPoint.y}%`,
                }}
                className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-4 flex items-center justify-center shadow-md ${
                  lastAttemptResult.isCorrect
                    ? 'border-emerald-400 bg-emerald-500/30'
                    : 'border-amber-400 bg-amber-500/30'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
            )}

            {/* Target highlight once answered correctly */}
            {isCheckpointAnsweredCorrect && activeCheckpoint.hotspotTarget && (
              <div
                style={{
                  left: `${activeCheckpoint.hotspotTarget.x}%`,
                  top: `${activeCheckpoint.hotspotTarget.y}%`,
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-emerald-400 bg-emerald-400/20"
              />
            )}

            {/* Bottom bar: Feedback OR accessible text fallback */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 bg-slate-950/90 text-white p-4 sm:px-6 border-t border-white/10"
            >
              {showResultForActive ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {lastAttemptResult.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          lastAttemptResult.isCorrect ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {lastAttemptResult.isCorrect
                          ? 'Benar! Kamu menemukannya'
                          : 'Belum tepat, coba klik bagian lain pada gambar'}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
                        {lastAttemptResult.isCorrect
                          ? activeCheckpoint.explanation
                          : `Petunjuk: ${activeCheckpoint.hotspotTarget?.hintLabel ?? 'Perhatikan benda penghasil bunyi di sebelah Bagas.'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!lastAttemptResult.isCorrect && (
                      <button
                        type="button"
                        onClick={() => onRewindForCheckpoint(activeCheckpoint)}
                        className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Putar Ulang Bagian Ini
                      </button>
                    )}
                    {lastAttemptResult.isCorrect && (
                      <button
                        type="button"
                        onClick={onContinueAfterQuiz}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Lanjut Menonton
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-slate-200">
                    Sentuh atau klik langsung benda pada gambar video di atas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHotspotTextFallback((v) => !v)}
                    className="text-xs font-medium text-sky-300 hover:text-sky-200 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {showHotspotTextFallback ? 'Tutup pilihan teks' : 'Atau pilih lewat tombol teks'}
                  </button>
                  {showHotspotTextFallback && (
                    <div className="w-full flex flex-wrap gap-2 pt-1">
                      {activeCheckpoint.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSubmitOption(activeCheckpoint, opt.id)}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-white transition-colors cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* STANDARD MULTIPLE-CHOICE / TRUE-FALSE QUIZ OVERLAY */}
        {activeCheckpoint && activeCheckpoint.type !== 'hotspot' && (
          <div className="absolute inset-0 bg-slate-950/78 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-xl bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 my-auto">
              <div className="flex items-center justify-between gap-4 text-xs text-slate-500 mb-2">
                <span>
                  {getSenseLabel(activeCheckpoint.senseId)} ·{' '}
                  {getQuestionTypeLabel(activeCheckpoint.type)}
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {formatTimestamp(activeCheckpoint.timestampSec)}
                </span>
              </div>

              <h3 className="font-display text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
                {activeCheckpoint.prompt}
              </h3>

              <div
                className={`mt-4 grid gap-2.5 ${
                  activeCheckpoint.type === 'true-false' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {activeCheckpoint.options.map((opt, idx) => {
                  const isSelected =
                    showResultForActive && lastAttemptResult.selectedOptionId === opt.id;
                  const isCorrectOption = opt.id === activeCheckpoint.correctOptionId;

                  let btnStyle =
                    'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-400 text-slate-800';

                  if (showResultForActive && lastAttemptResult.isCorrect) {
                    if (isCorrectOption) {
                      btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    } else {
                      btnStyle = 'bg-slate-50 border-slate-200 text-slate-400';
                    }
                  } else if (showResultForActive && !lastAttemptResult.isCorrect && isSelected) {
                    btnStyle = 'bg-amber-50 border-amber-500 text-amber-950';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={Boolean(showResultForActive && lastAttemptResult.isCorrect)}
                      onClick={() => onSubmitOption(activeCheckpoint, opt.id)}
                      className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors duration-150 flex items-center gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                    >
                      <span className="w-6 h-6 rounded-md bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-600 flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-snug">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {showResultForActive && (
                <div
                  className={`mt-4 rounded-xl p-3.5 border ${
                    lastAttemptResult.isCorrect
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {lastAttemptResult.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm">
                      <p className="font-semibold">
                        {lastAttemptResult.isCorrect
                          ? 'Benar! Jawabanmu Tepat'
                          : 'Belum Tepat — Yuk Coba Lagi'}
                      </p>
                      <p className="mt-0.5 text-slate-700 leading-relaxed">
                        {lastAttemptResult.isCorrect
                          ? activeCheckpoint.explanation
                          : 'Coba ingat kembali penjelasan di bagian video barusan, atau klik Putar Ulang Bagian Ini.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {!lastAttemptResult.isCorrect && (
                      <button
                        type="button"
                        onClick={() => onRewindForCheckpoint(activeCheckpoint)}
                        className="px-4 py-2 rounded-lg text-xs font-medium bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Putar Ulang Bagian Ini
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onContinueAfterQuiz}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {lastAttemptResult.isCorrect ? 'Lanjut Menonton' : 'Lewati & Lanjut'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Timeline Scrubber with Mid-Video Checkpoint Pins */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-t border-slate-200 bg-white">
        <div className="relative h-7 flex items-center">
          {/* Track background */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeek(ratio * duration);
            }}
            className="relative w-full h-2.5 bg-slate-200 rounded-full cursor-pointer"
          >
            {/* Chapter dividers for built-in video */}
            {videoSourceMode === 'builtin' &&
              segments.slice(1).map((seg) => (
                <div
                  key={seg.id}
                  style={{left: `${(seg.startSec / duration) * 100}%`}}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
                />
              ))}

            {/* Played fill */}
            <div
              style={{width: `${progressPct}%`}}
              className="h-full bg-sky-600 rounded-full transition-[width] duration-75"
            />
          </div>

          {/* Checkpoint Pins along timeline */}
          {checkpoints.map((cp, index) => {
            const leftPct = duration > 0 ? Math.min(98, Math.max(2, (cp.timestampSec / duration) * 100)) : 0;
            const ans = answers[cp.id];
            const isDone = Boolean(ans?.isCorrect);
            const isAttemptedWrong = Boolean(ans && !ans.isCorrect);

            return (
              <button
                key={cp.id}
                type="button"
                onClick={() => onOpenCheckpoint(cp)}
                title={`${cp.title} (${formatTimestamp(cp.timestampSec)})`}
                aria-label={`Buka ${cp.title} pada detik ${formatTimestamp(cp.timestampSec)}`}
                style={{left: `${leftPct}%`}}
                className={`absolute -translate-x-1/2 w-6 h-6 rounded-full border-2 text-[11px] font-mono font-semibold flex items-center justify-center transition-transform duration-150 hover:scale-110 cursor-pointer ${
                  isDone
                    ? 'bg-emerald-600 border-white text-white shadow-sm'
                    : isAttemptedWrong
                    ? 'bg-amber-500 border-white text-white shadow-sm'
                    : 'bg-white border-sky-600 text-sky-700 shadow-sm'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Player Controls Row */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="h-10 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPlaying && !activeCheckpoint ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Putar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              aria-label="Mundur 5 detik"
              title="Mundur 5 detik"
              className="h-10 w-10 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              aria-label="Maju 5 detik"
              title="Maju 5 detik"
              className="h-10 w-10 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <span className="ml-1 font-mono text-xs sm:text-sm tabular-nums text-slate-600">
              {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onToggleVoice}
              title={voiceEnabled ? 'Matikan suara narasi' : 'Aktifkan suara narasi'}
              className={`h-10 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                voiceEnabled
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Suara Aktif' : 'Suara Mati'}</span>
            </button>

            {videoSourceMode === 'builtin' && (
              <button
                type="button"
                onClick={onToggleSubtitles}
                title="Tampilkan atau sembunyikan teks narasi"
                className={`h-10 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showSubtitles
                    ? 'bg-slate-100 border-slate-300 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MessageSquareText className="w-4 h-4" />
                <span className="hidden sm:inline">Teks</span>
              </button>
            )}

            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
              {rates.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onPlaybackRateChange(r)}
                  className={`px-2 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    playbackRate === r
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
