/**
 * Web Audio API procedural sound effects and low-volume architectural ambient background loop
 * for Quadra Dots & Boxes.
 * Zero external audio files required; respects mute state, ambient toggle, pause state, and headless environments.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private ambientEnabled: boolean = true;
  private ambientVolume: number = 0.04; // Low-volume default (4% max gain)
  private isGameActive: boolean = false;

  // Ambient loop nodes
  private ambientMasterGain: GainNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private chimeIntervalId: number | null = null;
  private chimeStep: number = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateAmbientPlayback();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled;
    this.updateAmbientPlayback();
  }

  public isAmbientEnabled(): boolean {
    return this.ambientEnabled;
  }

  public setAmbientVolume(volume: number) {
    this.ambientVolume = Math.max(0.005, Math.min(0.12, volume));
    if (this.ambientMasterGain && this.ctx) {
      this.ambientMasterGain.gain.setTargetAtTime(
        this.muted || !this.ambientEnabled || !this.isGameActive
          ? 0.0001
          : this.ambientVolume,
        this.ctx.currentTime,
        0.15
      );
    }
  }

  public getAmbientVolume(): number {
    return this.ambientVolume;
  }

  /**
   * Synchronizes the architectural ambient loop with the current game shell state.
   */
  public syncAmbientState(isActive: boolean) {
    this.isGameActive = isActive;
    this.updateAmbientPlayback();
  }

  private updateAmbientPlayback() {
    const shouldPlay =
      this.ambientEnabled && !this.muted && this.isGameActive;

    if (!shouldPlay) {
      this.stopAmbientLoop();
      return;
    }

    this.startAmbientLoop();
  }

  private startAmbientLoop() {
    const ctx = this.getContext();
    if (!ctx) return;

    // If already running, smoothly ramp gain up
    if (this.ambientMasterGain) {
      this.ambientMasterGain.gain.setTargetAtTime(
        this.ambientVolume,
        ctx.currentTime,
        0.25
      );
      return;
    }

    try {
      const now = ctx.currentTime;

      // Master gain for the ambient loop (kept intentionally low-volume and unobtrusive)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.005, this.ambientVolume),
        now + 0.8
      );

      // Warm low-pass filter for the architectural pad
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);
      filter.Q.setValueAtTime(1.2, now);

      // Slow LFO modulating the low-pass cutoff (0.12 Hz breathing motion)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.12, now);
      lfoGain.gain.setValueAtTime(110, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Two warm detuned oscillators forming a calm root + fifth architectural drone (D2 + A2)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(73.42, now); // D2
      osc2.frequency.setValueAtTime(110.0, now); // A2

      const osc2SubGain = ctx.createGain();
      osc2SubGain.gain.setValueAtTime(0.35, now);

      osc1.connect(filter);
      osc2.connect(osc2SubGain);
      osc2SubGain.connect(filter);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.ambientMasterGain = masterGain;
      this.padOsc1 = osc1;
      this.padOsc2 = osc2;
      this.lfoOsc = lfo;

      // Sparse crystalline architectural harmonic pulse every 2.6 seconds
      const harmonicNotes = [293.66, 329.63, 440.0, 369.99, 587.33, 440.0]; // D4, E4, A4, F#4, D5, A4
      if (this.chimeIntervalId !== null) {
        window.clearInterval(this.chimeIntervalId);
      }
      this.chimeIntervalId = window.setInterval(() => {
        if (
          !this.ctx ||
          this.muted ||
          !this.ambientEnabled ||
          !this.isGameActive ||
          !this.ambientMasterGain
        ) {
          return;
        }
        const t = this.ctx.currentTime;
        const noteFreq =
          harmonicNotes[this.chimeStep % harmonicNotes.length];
        this.chimeStep++;

        const pingOsc = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(noteFreq, t);

        pingGain.gain.setValueAtTime(0.0001, t);
        pingGain.gain.linearRampToValueAtTime(0.28, t + 0.08);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

        pingOsc.connect(pingGain);
        pingGain.connect(this.ambientMasterGain);

        pingOsc.start(t);
        pingOsc.stop(t + 1.85);
      }, 2600);
    } catch {
      // Ignore Web Audio errors in restricted environments
    }
  }

  private stopAmbientLoop() {
    if (this.chimeIntervalId !== null) {
      window.clearInterval(this.chimeIntervalId);
      this.chimeIntervalId = null;
    }

    if (this.padOsc1) {
      try {
        this.padOsc1.stop();
        this.padOsc1.disconnect();
      } catch {}
      this.padOsc1 = null;
    }
    if (this.padOsc2) {
      try {
        this.padOsc2.stop();
        this.padOsc2.disconnect();
      } catch {}
      this.padOsc2 = null;
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {}
      this.lfoOsc = null;
    }
    if (this.ambientMasterGain) {
      try {
        this.ambientMasterGain.disconnect();
      } catch {}
      this.ambientMasterGain = null;
    }
  }

  /**
   * Crisp drafting pen click when an edge is drawn.
   */
  public playEdgeSnap(isPlayer: boolean) {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = isPlayer ? 520 : 390;
    const jitter = 1 + (Math.random() * 0.08 - 0.04);
    osc.frequency.setValueAtTime(baseFreq * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(
      baseFreq * 1.35 * jitter,
      now + 0.065
    );

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Harmonic chime when one or more boxes are captured, rising in pitch with chain combo!
   */
  public playBoxCapture(comboCount: number, isPlayer: boolean) {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const scaleSemitones = [0, 2, 4, 7, 9, 12, 14, 16, 19];
    const step =
      scaleSemitones[Math.min(comboCount - 1, scaleSemitones.length - 1)] || 0;
    const root = isPlayer ? 440 : 330;
    const freq = root * Math.pow(2, step / 12);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(freq, now);
    osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.18);

    osc2.frequency.setValueAtTime(freq * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.18);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.23);
    osc2.stop(now + 0.23);
  }

  /**
   * End-of-match fanfare or sting.
   */
  public playMatchEnd(outcome: 'player' | 'computer' | 'draw') {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      outcome === 'player'
        ? [523.25, 659.25, 783.99, 1046.5]
        : outcome === 'draw'
        ? [440, 523.25, 587.33]
        : [392.0, 349.23, 311.13, 261.63];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = outcome === 'player' ? 'triangle' : 'sine';
      const start = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }
}

export const soundEngine = new SoundEngine();
