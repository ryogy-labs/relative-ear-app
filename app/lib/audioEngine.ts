import { instrument as loadSoundfont, type Player } from "soundfont-player";

export type InstrumentKey = "synth" | "piano" | "guitar";
export type SampleStatus = "idle" | "downloading" | "ready" | "error";

type SampleInstrument = "piano" | "guitar";

type EngineStatus = {
  isLoading: boolean;
  fallbackMessage: string | null;
  activeInstrument: InstrumentKey;
  sampleStatus: Record<SampleInstrument, SampleStatus>;
};

type EngineListener = (status: EngineStatus) => void;

// Maps our instrument keys to MuseScore_General soundfont instrument names
const SOUNDFONT_NAMES = {
  piano: "acoustic_grand_piano",
  guitar: "acoustic_guitar_nylon",
} as const;

// Flat-notation note names matching gleitz soundfont file keys
const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function isMidiValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 127;
}

function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;

  private selectedInstrument: InstrumentKey = "synth";

  private activeInstrument: InstrumentKey = "synth";

  private loading = false;

  private fallbackMessage: string | null = null;

  // TODO: Replace with actual IAP check when integrating Pro tier purchases
  private isPro = false;

  private readonly sfPlayers = new Map<SampleInstrument, Player>();

  private readonly sampleStatuses: Record<SampleInstrument, SampleStatus> = {
    piano: "idle",
    guitar: "idle",
  };

  private readonly listeners = new Set<EngineListener>();

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async init(): Promise<void> {
    const context = this.getAudioContext();
    if (context.state === "suspended") {
      await context.resume();
    }
  }

  getStatus(): EngineStatus {
    return {
      isLoading: this.loading,
      fallbackMessage: this.fallbackMessage,
      activeInstrument: this.activeInstrument,
      sampleStatus: { ...this.sampleStatuses },
    };
  }

  private emit(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
    }
    return this.audioContext;
  }

  /** Call this whenever the user's Pro status changes (e.g. after IAP restore). */
  setProStatus(isPro: boolean): void {
    this.isPro = isPro;
  }

  async setInstrument(instrument: InstrumentKey): Promise<void> {
    this.selectedInstrument = instrument;

    if (instrument === "synth") {
      this.activeInstrument = "synth";
      this.fallbackMessage = null;
      this.emit();
      return;
    }

    // Non-Pro users cannot download or use sample instruments
    if (!this.isPro) {
      this.activeInstrument = "synth";
      this.fallbackMessage = null;
      this.emit();
      return;
    }

    // Already loaded — activate immediately
    if (this.sfPlayers.has(instrument)) {
      this.activeInstrument = instrument;
      this.fallbackMessage = null;
      this.emit();
      return;
    }

    this.loading = true;
    this.fallbackMessage = null;
    this.sampleStatuses[instrument] = "downloading";
    this.emit();

    try {
      const context = this.getAudioContext();
      const player = await loadSoundfont(context, SOUNDFONT_NAMES[instrument], {
        soundfont: "MuseScore_General",
        format: "mp3",
      });
      this.sfPlayers.set(instrument, player);
      this.sampleStatuses[instrument] = "ready";
      // Only switch active instrument if the user hasn't changed their mind
      if (this.selectedInstrument === instrument) {
        this.activeInstrument = instrument;
        this.fallbackMessage = null;
      }
    } catch {
      this.sampleStatuses[instrument] = "error";
      if (this.selectedInstrument === instrument) {
        this.activeInstrument = "synth";
        this.fallbackMessage = "Instrument audio failed to load. Falling back to Synth.";
      }
    } finally {
      this.loading = false;
      this.emit();
    }
  }

  async playNote(midiOrFreq: number, durationSeconds: number, volume = 1): Promise<void> {
    await this.init();
    const context = this.getAudioContext();
    const now = context.currentTime;

    if (this.activeInstrument !== "synth") {
      const player = this.sfPlayers.get(this.activeInstrument as SampleInstrument);
      if (player) {
        const midi = isMidiValue(midiOrFreq) ? midiOrFreq : freqToMidi(midiOrFreq);
        player.play(midiToNoteName(midi), now, { duration: durationSeconds, gain: volume * 0.9 });
        return;
      }
      // Player missing — fall through to synth
      this.activeInstrument = "synth";
      this.emit();
    }

    // Synth: simple sine wave with exponential envelope
    const frequency = isMidiValue(midiOrFreq) ? midiToFrequency(midiOrFreq) : midiOrFreq;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25 * volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSeconds);
  }
}
