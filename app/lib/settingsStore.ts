"use client";

const SETTINGS_STORAGE_KEY = "relative-ear.settings.v1";

type PreferencesGetResult = { value: string | null };
type PreferencesPlugin = {
  get(options: { key: string }): Promise<PreferencesGetResult>;
  set(options: { key: string; value: string }): Promise<void>;
};

export type Language = "en" | "ja";
export type TrainingMode = "melodic" | "harmony";
export type DirectionSetting = "ascending" | "descending" | "random";
export type NoteLengthKey = "short" | "medium" | "long";
export type RootMode = "random" | "fixedC";
export type InstrumentKey = "synth" | "piano" | "guitar";
export type ButtonSizeKey = "large" | "medium" | "small";

export type PersistedAppSettings = {
  language: Language;
  selectedIntervalIds: string[];
  maxRange: 12 | 24;
  mode: TrainingMode;
  directionSetting: DirectionSetting;
  noteLength: NoteLengthKey;
  rootMode: RootMode;
  instrument: InstrumentKey;
  buttonSize: ButtonSizeKey;
  sfxEnabled: boolean;
};

const VALID_INTERVAL_IDS = new Set(["m2", "M2", "m3", "M3", "P4", "b5", "P5", "#5", "M6", "m7", "M7", "P8"]);

export const DEFAULT_APP_SETTINGS: PersistedAppSettings = {
  language: "en",
  selectedIntervalIds: ["M2", "M3", "P4", "P5", "M6", "M7", "P8"],
  maxRange: 12,
  mode: "melodic",
  directionSetting: "random",
  noteLength: "short",
  rootMode: "random",
  instrument: "synth",
  buttonSize: "large",
  sfxEnabled: true,
};

function getCapacitorPreferences(): PreferencesPlugin | null {
  if (typeof window === "undefined") {
    return null;
  }

  const maybeCapacitor = (globalThis as { Capacitor?: { Plugins?: { Preferences?: PreferencesPlugin } } }).Capacitor;
  return maybeCapacitor?.Plugins?.Preferences ?? null;
}

function normalizeSettings(value: unknown): PersistedAppSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_APP_SETTINGS;
  }

  const candidate = value as Partial<PersistedAppSettings>;
  const selectedIntervalIds = Array.isArray(candidate.selectedIntervalIds)
    ? candidate.selectedIntervalIds.filter((intervalId): intervalId is string => VALID_INTERVAL_IDS.has(intervalId))
    : [];

  return {
    language: candidate.language === "ja" ? "ja" : "en",
    selectedIntervalIds:
      selectedIntervalIds.length > 0 ? Array.from(new Set(selectedIntervalIds)) : DEFAULT_APP_SETTINGS.selectedIntervalIds,
    maxRange: candidate.maxRange === 24 ? 24 : 12,
    mode: candidate.mode === "harmony" ? "harmony" : "melodic",
    directionSetting:
      candidate.directionSetting === "ascending" ||
      candidate.directionSetting === "descending" ||
      candidate.directionSetting === "random"
        ? candidate.directionSetting
        : "random",
    noteLength:
      candidate.noteLength === "medium" || candidate.noteLength === "long" ? candidate.noteLength : "short",
    rootMode: candidate.rootMode === "fixedC" ? "fixedC" : "random",
    instrument:
      candidate.instrument === "piano" || candidate.instrument === "guitar" || candidate.instrument === "synth"
        ? candidate.instrument
        : "synth",
    buttonSize:
      candidate.buttonSize === "medium" || candidate.buttonSize === "small" || candidate.buttonSize === "large"
        ? candidate.buttonSize
        : "large",
    sfxEnabled: candidate.sfxEnabled !== false,
  };
}

async function readStoredSettings(): Promise<string | null> {
  const preferences = getCapacitorPreferences();
  if (preferences) {
    try {
      const result = await preferences.get({ key: SETTINGS_STORAGE_KEY });
      if (result.value !== null) {
        return result.value;
      }
    } catch {
      // Fall back to localStorage
    }
  }

  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(SETTINGS_STORAGE_KEY);
}

async function writeStoredSettings(value: string): Promise<void> {
  const preferences = getCapacitorPreferences();
  if (preferences) {
    try {
      await preferences.set({ key: SETTINGS_STORAGE_KEY, value });
      return;
    } catch {
      // Fall back to localStorage
    }
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, value);
  }
}

export async function loadAppSettings(): Promise<PersistedAppSettings> {
  try {
    const raw = await readStoredSettings();
    if (!raw) {
      return DEFAULT_APP_SETTINGS;
    }
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveAppSettings(settings: PersistedAppSettings): Promise<void> {
  await writeStoredSettings(JSON.stringify(settings));
}
