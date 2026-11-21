let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, startTimeOffset = 0, type: OscillatorType = 'sine', volume = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + startTimeOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playCheckpointChime(enabled: boolean) {
  if (!enabled) return;
  playTone(523.25, 0.14, 0, 'triangle', 0.07); // C5
  playTone(659.25, 0.22, 0.11, 'triangle', 0.07); // E5
}

export function playCorrectSound(enabled: boolean) {
  if (!enabled) return;
  playTone(523.25, 0.12, 0, 'sine', 0.08); // C5
  playTone(659.25, 0.12, 0.09, 'sine', 0.08); // E5
  playTone(783.99, 0.28, 0.18, 'sine', 0.09); // G5
}

export function playRetrySound(enabled: boolean) {
  if (!enabled) return;
  playTone(349.23, 0.15, 0, 'triangle', 0.06); // F4
  playTone(293.66, 0.22, 0.12, 'triangle', 0.06); // D4
}

export function playCompleteSound(enabled: boolean) {
  if (!enabled) return;
  playTone(523.25, 0.12, 0, 'sine', 0.08);
  playTone(659.25, 0.12, 0.1, 'sine', 0.08);
  playTone(783.99, 0.14, 0.2, 'sine', 0.08);
  playTone(1046.5, 0.36, 0.32, 'sine', 0.09);
}
