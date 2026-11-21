import React, {useState} from 'react';
import {Eye, Hand, Headphones, Play, Utensils, Wind} from 'lucide-react';
import {LessonSegment, SenseId} from '../types/lesson';
import {formatTimestamp} from '../utils/timeFormat';

interface SenseReferenceDeckProps {
  segments: LessonSegment[];
  currentTime: number;
  onWatchSegment: (startSec: number) => void;
}

function getSenseIcon(senseId: SenseId) {
  switch (senseId) {
    case 'mata':
      return <Eye className="w-5 h-5" />;
    case 'telinga':
      return <Headphones className="w-5 h-5" />;
    case 'hidung':
      return <Wind className="w-5 h-5" />;
    case 'lidah':
      return <Utensils className="w-5 h-5" />;
    case 'kulit':
      return <Hand className="w-5 h-5" />;
  }
}

export const SenseReferenceDeck: React.FC<SenseReferenceDeckProps> = ({
  segments,
  currentTime,
  onWatchSegment,
}) => {
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  return (
    <section id="ringkasan-indra" className="pt-10 border-t border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-medium text-sky-700">Ringkasan Materi</p>
          <h2 className="font-display text-2xl font-semibold text-slate-900 mt-1">
            Lima Pancaindra Manusia
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-md">
          Pilih salah satu indra di bawah untuk langsung memutar bagian video pembelajarannya.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {segments.map((seg) => {
          const isCurrent = currentTime >= seg.startSec && currentTime < seg.endSec;

          return (
            <article
              key={seg.id}
              className={`bg-white rounded-2xl border overflow-hidden flex flex-col transition-colors ${
                isCurrent ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
              }`}
            >
              <div className="aspect-video w-full bg-slate-100 overflow-hidden">
                {!failedThumbs[seg.id] ? (
                  <img
                    src={seg.imageSrc}
                    alt={`${seg.organName} — ${seg.senseName}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedThumbs((prev) => ({...prev, [seg.id]: true}))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${seg.fallbackGradient} flex items-center justify-center text-sky-700`}
                  >
                    {getSenseIcon(seg.senseId)}
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{seg.senseName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatTimestamp(seg.startSec)}–{formatTimestamp(seg.endSec)}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900 mt-1 flex items-center gap-2">
                    <span className="text-sky-700">{getSenseIcon(seg.senseId)}</span>
                    <span>{seg.organName}</span>
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{seg.keyFact}</p>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Cara merawat: {seg.careTip}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onWatchSegment(seg.startSec)}
                  className="w-full h-10 px-4 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-sky-600" />
                  <span>Tonton Bagian {seg.organName}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
