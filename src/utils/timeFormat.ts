export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getQuestionTypeLabel(type: 'multiple-choice' | 'true-false' | 'hotspot'): string {
  switch (type) {
    case 'multiple-choice':
      return 'Pilihan Ganda';
    case 'true-false':
      return 'Benar / Salah';
    case 'hotspot':
      return 'Klik Objek di Video';
  }
}

export function getSenseLabel(senseId: string): string {
  switch (senseId) {
    case 'mata':
      return 'Mata · Penglihatan';
    case 'telinga':
      return 'Telinga · Pendengaran';
    case 'hidung':
      return 'Hidung · Penciuman';
    case 'lidah':
      return 'Lidah · Pengecap';
    case 'kulit':
      return 'Kulit · Peraba';
    default:
      return 'Pancaindra';
  }
}
