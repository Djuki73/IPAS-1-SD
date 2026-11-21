import React, {useState} from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Film,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AppMode,
  QuestionType,
  QuizCheckpoint,
  SenseId,
  StudentAnswer,
  VideoSourceMode,
} from '../types/lesson';
import {formatTimestamp, getQuestionTypeLabel, getSenseLabel} from '../utils/timeFormat';

interface CheckpointSidebarProps {
  appMode: AppMode;
  checkpoints: QuizCheckpoint[];
  answers: Record<string, StudentAnswer>;
  currentTime: number;
  duration: number;
  activeCheckpointId: string | null;
  videoSourceMode: VideoSourceMode;
  customVideoName: string | null;
  onJumpToCheckpoint: (checkpoint: QuizCheckpoint) => void;
  onOpenCheckpointQuiz: (checkpoint: QuizCheckpoint) => void;
  onAddCheckpoint: (checkpoint: QuizCheckpoint) => void;
  onDeleteCheckpoint: (id: string) => void;
  onResetCheckpoints: () => void;
  onSwitchToBuiltinVideo: () => void;
  onUploadCustomVideo: (file: File) => void;
}

export const CheckpointSidebar: React.FC<CheckpointSidebarProps> = ({
  appMode,
  checkpoints,
  answers,
  currentTime,
  duration,
  activeCheckpointId,
  videoSourceMode,
  customVideoName,
  onJumpToCheckpoint,
  onOpenCheckpointQuiz,
  onAddCheckpoint,
  onDeleteCheckpoint,
  onResetCheckpoints,
  onSwitchToBuiltinVideo,
  onUploadCustomVideo,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTimestamp, setFormTimestamp] = useState(Math.round(currentTime));
  const [formSense, setFormSense] = useState<SenseId>('mata');
  const [formType, setFormType] = useState<QuestionType>('multiple-choice');
  const [formPrompt, setFormPrompt] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formCorrectIdx, setFormCorrectIdx] = useState(0);
  const [formExplanation, setFormExplanation] = useState('');

  const completedCount = checkpoints.filter((cp) => answers[cp.id]?.isCorrect).length;
  const progressRatio = checkpoints.length > 0 ? (completedCount / checkpoints.length) * 100 : 0;

  const handleOpenAddForm = () => {
    setFormTimestamp(Math.min(Math.max(1, Math.round(currentTime)), Math.max(1, Math.floor(duration))));
    setFormPrompt('');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormCorrectIdx(0);
    setFormExplanation('');
    setShowAddForm(true);
  };

  const handleSaveNewQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrompt.trim()) return;

    const id = `cp-custom-${Date.now()}`;
    const options =
      formType === 'true-false'
        ? [
            {id: `${id}-benar`, label: 'Benar'},
            {id: `${id}-salah`, label: 'Salah'},
          ]
        : [
            {id: `${id}-a`, label: formOptA.trim() || 'Pilihan A'},
            {id: `${id}-b`, label: formOptB.trim() || 'Pilihan B'},
            ...(formOptC.trim() ? [{id: `${id}-c`, label: formOptC.trim()}] : []),
          ];

    const safeIdx = Math.min(formCorrectIdx, options.length - 1);

    const newCp: QuizCheckpoint = {
      id,
      timestampSec: Math.min(Math.max(1, formTimestamp), Math.max(1, Math.floor(duration))),
      rewindToSec: Math.max(0, formTimestamp - 10),
      senseId: formSense,
      title: `Kuis ${checkpoints.length + 1}: ${getSenseLabel(formSense).split(' · ')[0]}`,
      type: formType,
      prompt: formPrompt.trim(),
      options,
      correctOptionId: options[safeIdx].id,
      explanation:
        formExplanation.trim() ||
        `Jawaban yang tepat adalah "${options[safeIdx].label}".`,
    };

    onAddCheckpoint(newCp);
    setShowAddForm(false);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(
      {
        subject: 'IPAS Kelas 1 SD — Pengenalan Pancaindra',
        checkpoints,
      },
      null,
      2
    );
    const blob = new Blob([payload], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kuis-video-ipas-pancaindra.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-5">
      {/* Header & Progress */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            {appMode === 'student' ? 'Alur Video & Soal' : 'Editor Soal Guru'}
          </h2>
          <span className="font-mono text-xs tabular-nums font-medium text-slate-600">
            {completedCount}/{checkpoints.length} Selesai
          </span>
        </div>

        {appMode === 'student' ? (
          <div className="mt-3">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{width: `${progressRatio}%`}}
                className="h-full bg-emerald-600 rounded-full transition-[width] duration-200"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Video berhenti otomatis di setiap titik kuis. Klik nomor soal untuk langsung menuju bagian tersebut.
            </p>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
            <p className="text-xs font-medium text-slate-700">Sumber Video Pembelajaran</p>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={onSwitchToBuiltinVideo}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                  videoSourceMode === 'builtin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Animasi Bawaan
              </button>
              <label
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md text-center transition-colors whitespace-nowrap truncate cursor-pointer ${
                  videoSourceMode === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Unggah MP4</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadCustomVideo(file);
                  }}
                />
              </label>
            </div>
            {videoSourceMode === 'custom' && customVideoName && (
              <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                <Film className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">{customVideoName}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Teacher Add Question Action */}
      {appMode === 'teacher' && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="flex-1 h-10 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal ({formatTimestamp(currentTime)})</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            title="Unduh file JSON daftar soal"
            className="h-10 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>JSON</span>
          </button>
        </div>
      )}

      {/* Teacher Add Form */}
      {appMode === 'teacher' && showAddForm && (
        <form
          onSubmit={handleSaveNewQuestion}
          className="border border-sky-200 bg-sky-50/50 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Soal Baru di Tengah Video</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Detik Muncul
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.floor(duration))}
                value={formTimestamp}
                onChange={(e) => setFormTimestamp(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Topik Indra
              </label>
              <select
                value={formSense}
                onChange={(e) => setFormSense(e.target.value as SenseId)}
                className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="mata">Mata</option>
                <option value="telinga">Telinga</option>
                <option value="hidung">Hidung</option>
                <option value="lidah">Lidah</option>
                <option value="kulit">Kulit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Soal</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFormType('multiple-choice');
                  setFormCorrectIdx(0);
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                  formType === 'multiple-choice'
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                Pilihan Ganda
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('true-false');
                  setFormCorrectIdx(0);
                }}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                  formType === 'true-false'
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                Benar / Salah
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Pertanyaan</label>
            <textarea
              required
              rows={2}
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              placeholder="Contoh: Indra apakah yang kita pakai untuk mendengar suara bel?"
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

          {formType === 'multiple-choice' ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Pilihan Jawaban (pilih yang benar)
              </label>
              {[
                {label: 'A', val: formOptA, set: setFormOptA, idx: 0, req: true},
                {label: 'B', val: formOptB, set: setFormOptB, idx: 1, req: true},
                {label: 'C', val: formOptC, set: setFormOptC, idx: 2, req: false},
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOpt"
                    checked={formCorrectIdx === item.idx}
                    onChange={() => setFormCorrectIdx(item.idx)}
                    aria-label={`Tandai pilihan ${item.label} sebagai benar`}
                  />
                  <input
                    type="text"
                    required={item.req}
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    placeholder={`Pilihan ${item.label}${item.req ? '' : ' (opsional)'}`}
                    className="flex-1 h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kunci Jawaban
              </label>
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tfCorrect"
                    checked={formCorrectIdx === 0}
                    onChange={() => setFormCorrectIdx(0)}
                  />
                  <span>Benar</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tfCorrect"
                    checked={formCorrectIdx === 1}
                    onChange={() => setFormCorrectIdx(1)}
                  />
                  <span>Salah</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pembahasan Singkat
            </label>
            <input
              type="text"
              value={formExplanation}
              onChange={(e) => setFormExplanation(e.target.value)}
              placeholder="Penjelasan singkat setelah siswa menjawab"
              className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Simpan Soal ke Timeline
          </button>
        </form>
      )}

      {/* Checkpoints List */}
      <div className="divide-y divide-slate-100 -mx-1">
        {checkpoints.map((cp, idx) => {
          const ans = answers[cp.id];
          const isDone = Boolean(ans?.isCorrect);
          const isWrong = Boolean(ans && !ans.isCorrect);
          const isActive = activeCheckpointId === cp.id;

          return (
            <div
              key={cp.id}
              className={`px-2 py-3 rounded-xl transition-colors ${
                isActive ? 'bg-sky-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onJumpToCheckpoint(cp)}
                  className="text-left flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums font-medium text-slate-700">
                      {formatTimestamp(cp.timestampSec)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{getQuestionTypeLabel(cp.type)}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                    {idx + 1}. {cp.title}
                  </p>
                </button>

                {appMode === 'teacher' ? (
                  <button
                    type="button"
                    onClick={() => onDeleteCheckpoint(cp.id)}
                    aria-label={`Hapus ${cp.title}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenCheckpointQuiz(cp)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isDone ? 'Lihat' : 'Jawab'}
                  </button>
                )}
              </div>

              {/* Explicit icon + text status (never hue-only) */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Benar</span>
                  </span>
                ) : isWrong ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Perlu Diulang</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Menunggu</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {appMode === 'teacher' && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onResetCheckpoints}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
          >
            Kembalikan soal bawaan
          </button>
          <span className="text-xs text-slate-400 inline-flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>Lokal browser</span>
          </span>
        </div>
      )}
    </aside>
  );
};
