let playing = false;

export function playPinSound() {
  if (playing || typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  playing = true;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(190, start);
  oscillator.frequency.exponentialRampToValueAtTime(420, start + 0.075);
  oscillator.frequency.exponentialRampToValueAtTime(270, start + 0.17);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.14, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.21);
  oscillator.onended = () => {
    void context.close();
    window.setTimeout(() => { playing = false; }, 280);
  };
}
