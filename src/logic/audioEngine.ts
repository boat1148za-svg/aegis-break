export type BgmTrack = 'none' | 'standard' | 'boss';
export type SfxKind = 'click' | 'beam' | 'slash' | 'hit' | 'explosion' | 'spirit';

interface AudioPrefs {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
}

const AUDIO_STORAGE_KEY = 'aegis_break_audio_v1';

function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { bgmEnabled: true, sfxEnabled: true };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      bgmEnabled: parsed.bgmEnabled !== false,
      sfxEnabled: parsed.sfxEnabled !== false,
    };
  } catch {
    return { bgmEnabled: true, sfxEnabled: true };
  }
}

function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures
  }
}

// MIDI note number -> Hz
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Standard Tactical Synthwave (Am -> F -> C -> G, 16-step pattern)
const STANDARD_BASS = [45, 45, 45, 48, 41, 41, 41, 45, 48, 48, 48, 52, 43, 43, 47, 43];
const STANDARD_LEAD = [69, 0, 72, 76, 72, 0, 69, 64, 72, 0, 76, 79, 76, 74, 71, 67];

// Boss High-Intensity Synth (Dm -> Bb -> Gm -> A7, 16-step urgent pattern)
const BOSS_BASS = [38, 38, 50, 38, 46, 46, 58, 46, 43, 43, 55, 43, 45, 49, 52, 45];
const BOSS_LEAD = [74, 77, 81, 77, 74, 70, 74, 77, 79, 77, 74, 70, 73, 76, 81, 79];

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private prefs: AudioPrefs = loadAudioPrefs();
  private currentTrack: BgmTrack = 'none';
  private stepTimer: number | null = null;
  private stepIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getPrefs(): AudioPrefs {
    return { ...this.prefs };
  }

  public setBgmEnabled(enabled: boolean): AudioPrefs {
    this.prefs = { ...this.prefs, bgmEnabled: enabled };
    saveAudioPrefs(this.prefs);
    if (!enabled) {
      this.stopLoopTimer();
    } else if (this.currentTrack !== 'none') {
      this.startLoopTimer();
    }
    return this.getPrefs();
  }

  public setSfxEnabled(enabled: boolean): AudioPrefs {
    this.prefs = { ...this.prefs, sfxEnabled: enabled };
    saveAudioPrefs(this.prefs);
    return this.getPrefs();
  }

  public unlock(): void {
    this.ensureContext();
    if (this.prefs.bgmEnabled && this.currentTrack !== 'none' && !this.stepTimer) {
      this.startLoopTimer();
    }
  }

  public setBgmTrack(track: BgmTrack): void {
    if (this.currentTrack === track && this.stepTimer !== null) return;
    this.currentTrack = track;
    this.stopLoopTimer();
    this.stepIndex = 0;
    if (track !== 'none' && this.prefs.bgmEnabled) {
      this.startLoopTimer();
    }
  }

  private stopLoopTimer(): void {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }

  private startLoopTimer(): void {
    this.stopLoopTimer();
    const isBoss = this.currentTrack === 'boss';
    // 16th-note step duration: Standard 116 BPM (~258ms per 8th), Boss 148 BPM (~202ms per 8th)
    const stepMs = isBoss ? 195 : 255;

    this.stepTimer = window.setInterval(() => {
      if (!this.prefs.bgmEnabled || this.currentTrack === 'none') return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const idx = this.stepIndex % 16;
      this.stepIndex += 1;
      const now = ctx.currentTime;

      const bassNotes = isBoss ? BOSS_BASS : STANDARD_BASS;
      const leadNotes = isBoss ? BOSS_LEAD : STANDARD_LEAD;

      // Bass synth
      const bassMidi = bassNotes[idx];
      if (bassMidi > 0) {
        this.playTone(
          ctx,
          midiToFreq(bassMidi),
          isBoss ? 'sawtooth' : 'triangle',
          now,
          stepMs / 1000 * 0.85,
          isBoss ? 0.065 : 0.06,
          isBoss ? 900 : 650
        );
      }

      // Lead arpeggio synth
      const leadMidi = leadNotes[idx];
      if (leadMidi > 0) {
        this.playTone(
          ctx,
          midiToFreq(leadMidi),
          isBoss ? 'square' : 'sawtooth',
          now,
          stepMs / 1000 * 0.72,
          isBoss ? 0.04 : 0.032,
          isBoss ? 2200 : 1600
        );
      }

      // Subtle kick pulse on beats 0, 4, 8, 12 (and extra syncopation for boss)
      if (idx % 4 === 0 || (isBoss && idx % 4 === 2)) {
        this.playKick(ctx, now, isBoss ? 0.09 : 0.06);
      }
    }, stepMs);
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    gainPeak: number,
    cutoffHz: number
  ): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playKick(ctx: AudioContext, startTime: number, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.11);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.14);
  }

  public playSfx(kind: SfxKind): void {
    if (!this.prefs.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    switch (kind) {
      case 'click':
        this.playTone(ctx, 880, 'sine', now, 0.06, 0.06, 3000);
        break;
      case 'beam': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.24);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
        break;
      }
      case 'slash': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'hit':
        this.playKick(ctx, now, 0.16);
        this.playTone(ctx, 180, 'square', now, 0.12, 0.08, 700);
        break;
      case 'explosion':
        this.playKick(ctx, now, 0.2);
        this.playTone(ctx, 95, 'sawtooth', now, 0.34, 0.12, 420);
        this.playTone(ctx, 68, 'square', now + 0.05, 0.3, 0.09, 320);
        break;
      case 'spirit':
        this.playTone(ctx, 523.25, 'triangle', now, 0.14, 0.08, 2600);
        this.playTone(ctx, 659.25, 'triangle', now + 0.07, 0.16, 0.08, 2600);
        this.playTone(ctx, 783.99, 'triangle', now + 0.14, 0.22, 0.09, 3000);
        break;
    }
  }
}

export const audioEngine = new SynthAudioEngine();
