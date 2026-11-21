import React from 'react';
import {Award, CheckCircle2, Clock, RotateCcw} from 'lucide-react';
import {QuizCheckpoint, StudentAnswer} from '../types/lesson';
import {formatTimestamp, getSenseLabel} from '../utils/timeFormat';

interface CompletionSummaryProps {
  checkpoints: QuizCheckpoint[];
  answers: Record<string, StudentAnswer>;
  onRetryAll: () => void;
  onJumpToCheckpoint: (checkpoint: QuizCheckpoint) => void;
}

export const CompletionSummary: React.FC<CompletionSummaryProps> = ({
  checkpoints,
  answers,
  onRetryAll,
  onJumpToCheckpoint,
}) => {
  const total = checkpoints.length;
  const answeredCount = checkpoints.filter((cp) => Boolean(answers[cp.id])).length;
  const correctCount = checkpoints.filter((cp) => answers[cp.id]?.isCorrect).length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const allCompleted = total > 0 && correctCount === total;

  return (
    <section
      id="rapor-hasil"
      className="pt-10 border-t border-slate-200"
    >
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <p className="text-xs font-medium text-sky-700">Rapor Belajar Siswa</p>
            <h2 className="font-display text-2xl font-semibold text-slate-900 mt-1">
              {allCompleted
                ? 'Selamat! Semua Soal Pancaindra Selesai'
                : 'Ringkasan Jawaban Video Interaktif'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {allCompleted
                ? 'Kamu sudah berhasil menjawab seluruh pertanyaan di tengah video dengan tepat.'
                : `Baru ${answeredCount} dari ${total} soal dijawab. Lanjutkan menonton untuk melengkapi semua checkpoint.`}
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-xs text-slate-500">Skor Benar</p>
              <p className="font-display text-3xl font-bold tabular-nums text-slate-900">
                {correctCount}/{total}
                <span className="ml-2 text-base font-medium text-slate-500">({scorePct}%)</span>
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                allCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-sky-50 text-sky-700 border border-sky-200'
              }`}
            >
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Clean tabular list of checkpoint outcomes */}
        <div className="mt-5 divide-y divide-slate-100">
          {checkpoints.map((cp, index) => {
            const ans = answers[cp.id];
            const isCorrect = Boolean(ans?.isCorrect);
            const isAttempted = Boolean(ans);

            return (
              <div
                key={cp.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">{formatTimestamp(cp.timestampSec)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getSenseLabel(cp.senseId)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {index + 1}. {cp.prompt}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Benar ({ans.attempts}x coba)</span>
                    </span>
                  ) : isAttempted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <RotateCcw className="w-4 h-4" />
                      <span>Belum Tepat</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>Belum Dijawab</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onJumpToCheckpoint(cp)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isCorrect ? 'Ulas' : 'Buka Soal'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Ingin mencoba lagi dari menit awal dengan seluruh soal ter-reset?
          </p>
          <button
            type="button"
            onClick={onRetryAll}
            className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ulangi Video & Kuis</span>
          </button>
        </div>
      </div>
    </section>
  );
};
