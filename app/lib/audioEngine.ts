export type InstrumentKey = "synth" | "piano" | "guitar";

type PartialSpec = {
  ratio: number;
  gain: number;
  type: OscillatorType;
  detuneCents?: number[];
  life?: number;
};

type EnvelopeSpec = {
  peak: number;
  attack: number;
  decayTo: number;
  decayAt: number;
  releaseAt: number;
};

type FilterSpec = {
  type: BiquadFilterType;
  startHz: number;
  endHz?: number;
  endAt?: number;
  q?: number;
  gain?: number;
};

type NoiseSpec = {
  enabled: boolean;
  gainPeak: number;
  attack: number;
  releaseAt: number;
  filterType: BiquadFilterType;
  filterHz: number;
  filterQ?: number;
};

type SoundfontPatch = {
  partials: PartialSpec[];
  envelope: EnvelopeSpec;
  filters?: FilterSpec[];
  noise?: NoiseSpec;
};

type EngineStatus = {
  isLoading: boolean;
  fallbackMessage: string | null;
  activeInstrument: InstrumentKey;
};

type EngineListener = (status: EngineStatus) => void;

type SoundfontResponse = {
  patch: SoundfontPatch;
};

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function isMidiValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 127;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;

  private noiseBuffer: AudioBuffer | null = null;

  private selectedInstrument: InstrumentKey = "synth";

  private activeInstrument: InstrumentKey = "synth";

  private loading = false;

  private fallbackMessage: string | null = null;

  private readonly patches = new Map<InstrumentKey, SoundfontPatch>();

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

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== context.sampleRate) {
      const length = Math.max(1, Math.floor(context.sampleRate * 2));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  async setInstrument(instrument: InstrumentKey): Promise<void> {
    this.selectedInstrument = instrument;

    if (instrument === "synth") {
      this.activeInstrument = "synth";
      this.fallbackMessage = null;
      this.emit();
      return;
    }

    if (this.patches.has(instrument)) {
      this.activeInstrument = instrument;
      this.fallbackMessage = null;
      this.emit();
      return;
    }

    this.loading = true;
    this.fallbackMessage = null;
    this.emit();

    try {
      const response = await fetch(`/soundfonts/${instrument}-lite.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${instrument} soundfont`);
      }
      const data = (await response.json()) as SoundfontResponse;
      if (!data?.patch?.partials?.length) {
        throw new Error(`Invalid ${instrument} soundfont payload`);
      }
      this.patches.set(instrument, data.patch);
      this.activeInstrument = instrument;
      this.fallbackMessage = null;
    } catch {
      this.activeInstrument = "synth";
      this.fallbackMessage = "Instrument audio failed to load. Falling back to Synth.";
    } finally {
      this.loading = false;
      this.emit();
    }
  }

  async playNote(midiOrFreq: number, durationSeconds: number, volume = 1): Promise<void> {
    await this.init();
    const context = this.getAudioContext();
    const frequency = isMidiValue(midiOrFreq) ? midiToFrequency(midiOrFreq) : midiOrFreq;
    const now = context.currentTime;

    if (this.activeInstrument === "synth") {
      // Keep Synth exactly the same as the previous behavior.
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
      return;
    }

    const patch = this.patches.get(this.activeInstrument);
    if (!patch) {
      this.activeInstrument = "synth";
      this.emit();
      return this.playNote(midiOrFreq, durationSeconds, volume);
    }

    const master = context.createGain();
    const envelope = patch.envelope;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(envelope.peak * volume, now + envelope.attack);
    master.gain.exponentialRampToValueAtTime(envelope.decayTo * volume, now + durationSeconds * envelope.decayAt);
    master.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds * envelope.releaseAt);

    let chain: AudioNode = master;
    (patch.filters ?? []).forEach((filterSpec) => {
      const filter = context.createBiquadFilter();
      filter.type = filterSpec.type;
      filter.frequency.setValueAtTime(filterSpec.startHz, now);
      if (filterSpec.endHz && filterSpec.endAt) {
        filter.frequency.exponentialRampToValueAtTime(filterSpec.endHz, now + durationSeconds * filterSpec.endAt);
      }
      if (typeof filterSpec.q === "number") {
        filter.Q.setValueAtTime(filterSpec.q, now);
      }
      if (typeof filterSpec.gain === "number") {
        filter.gain.setValueAtTime(filterSpec.gain, now);
      }
      chain.connect(filter);
      chain = filter;
    });
    chain.connect(context.destination);

    patch.partials.forEach((partial) => {
      const detunes = partial.detuneCents && partial.detuneCents.length > 0 ? partial.detuneCents : [0];
      detunes.forEach((detuneCents) => {
        const oscillator = context.createOscillator();
        const partialGain = context.createGain();
        const detuneRatio = Math.pow(2, detuneCents / 1200);
        const life = partial.life ?? 1;

        oscillator.type = partial.type;
        oscillator.frequency.setValueAtTime(frequency * partial.ratio * detuneRatio, now);

        partialGain.gain.setValueAtTime(0.0001, now);
        partialGain.gain.exponentialRampToValueAtTime(partial.gain / detunes.length, now + 0.01);
        partialGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds * life);

        oscillator.connect(partialGain);
        partialGain.connect(master);
        oscillator.start(now);
        oscillator.stop(now + durationSeconds * life + 0.02);
      });
    });

    if (patch.noise?.enabled) {
      const noise = context.createBufferSource();
      const noiseGain = context.createGain();
      const noiseFilter = context.createBiquadFilter();
      noise.buffer = this.getNoiseBuffer(context);

      noiseFilter.type = patch.noise.filterType;
      noiseFilter.frequency.setValueAtTime(patch.noise.filterHz, now);
      if (patch.noise.filterQ) {
        noiseFilter.Q.setValueAtTime(patch.noise.filterQ, now);
      }

      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(patch.noise.gainPeak * volume, now + patch.noise.attack);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + patch.noise.releaseAt);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + patch.noise.releaseAt + 0.005);
    }
  }
}
