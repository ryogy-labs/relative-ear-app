"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Interval = {
  id: string;
  semitones: number;
};

type TrainingMode = "melodic" | "harmony";
type DirectionSetting = "ascending" | "descending" | "random";
type ResolvedDirection = "ascending" | "descending";
type PresetKey = "beginner" | "basic" | "jazzIntro";
type Language = "en" | "ja";
type NoteLengthKey = "short" | "medium" | "long";
type AppTab = "practice" | "stats" | "settings";

type Round = {
  answerId: string;
  distance: number;
  direction: ResolvedDirection;
  note1Midi: number;
  note2Midi: number;
};

type UiText = {
  title: string;
  settings: string;
  systemSettings: string;
  practiceSettings: string;
  language: string;
  presets: string;
  beginner: string;
  basic: string;
  jazzIntro: string;
  maxRange: string;
  oneOctave: string;
  twoOctaves: string;
  rangeHelp: string;
  mode: string;
  melodic: string;
  harmony: string;
  modeHelp: string;
  direction: string;
  ascending: string;
  descending: string;
  random: string;
  noteLength: string;
  short: string;
  medium: string;
  long: string;
  intervalPool: string;
  practice: string;
  practiceHelp: string;
  play: string;
  currentDirection: string;
  selectOne: string;
  nextInterval: string;
  stats: string;
  total: string;
  correct: string;
  accuracy: string;
  correctFeedback: string;
  incorrectFeedback: string;
  correctAnswer: string;
  octaveLabel: string;
  keyboard: string;
  keyboardHelp: string;
  showKeyboard: string;
  closeKeyboard: string;
  intervalBreakdown: string;
  resetStats: string;
  soundEffects: string;
  on: string;
  off: string;
};

const I18N: Record<Language, UiText> = {
  en: {
    title: "Interval Ear Trainer",
    settings: "Settings",
    systemSettings: "System Settings",
    practiceSettings: "Practice Settings",
    language: "Language",
    presets: "Presets",
    beginner: "Easy",
    basic: "Normal",
    jazzIntro: "Hard",
    maxRange: "Max interval range",
    oneOctave: "1 Oct",
    twoOctaves: "2 Oct",
    rangeHelp: "Choose the maximum distance between the two notes.",
    mode: "Mode",
    melodic: "Melodic",
    harmony: "Harmony",
    modeHelp:
      "Harmony:\nTwo notes play together.\nThe lower note is the reference.\n\nMelodic:\nNotes play one after another.\nThe first note is the reference.",
    direction: "Melodic direction",
    ascending: "Ascending",
    descending: "Descending",
    random: "Random",
    noteLength: "Note Length",
    short: "Short",
    medium: "Medium",
    long: "Long",
    intervalPool: "Interval pool",
    practice: "Practice",
    practiceHelp: "Listen. Feel the distance. Choose the interval.",
    play: "Play",
    currentDirection: "Current direction",
    selectOne: "Select at least one interval to start.",
    nextInterval: "Next interval",
    stats: "Stats",
    total: "Total",
    correct: "Correct",
    accuracy: "Accuracy",
    correctFeedback: "Correct!",
    incorrectFeedback: "Incorrect.",
    correctAnswer: "Correct answer:",
    octaveLabel: "Octave",
    keyboard: "Keyboard",
    keyboardHelp: "Tap keys to verify the interval.",
    showKeyboard: "Show keyboard",
    closeKeyboard: "Close keyboard",
    intervalBreakdown: "Interval Breakdown",
    resetStats: "Reset Stats",
    soundEffects: "Sound Effects",
    on: "ON",
    off: "OFF",
  },
  ja: {
    title: "音程イヤートレーナー",
    settings: "設定",
    systemSettings: "システム設定",
    practiceSettings: "練習設定",
    language: "言語",
    presets: "プリセット",
    beginner: "初級",
    basic: "中級",
    jazzIntro: "上級",
    maxRange: "最大音程範囲",
    oneOctave: "1オクターブ",
    twoOctaves: "2オクターブ",
    rangeHelp: "2音間の最大距離を選択します。",
    mode: "モード",
    melodic: "メロディック",
    harmony: "ハーモニー",
    modeHelp:
      "ハーモニー:\n2音を同時に鳴らします。\n低い音が基準音です。\n\nメロディック:\n2音を順番に鳴らします。\n最初の音が基準音です。",
    direction: "メロディック方向",
    ascending: "上行",
    descending: "下行",
    random: "ランダム",
    noteLength: "音の長さ",
    short: "短い",
    medium: "中くらい",
    long: "長い",
    intervalPool: "出題音程プール",
    practice: "練習",
    practiceHelp: "音を聴いて、度数を選択。",
    play: "再生",
    currentDirection: "現在の方向",
    selectOne: "少なくとも1つの音程を選択してください。",
    nextInterval: "次の音程",
    stats: "統計",
    total: "総数",
    correct: "正解",
    accuracy: "正答率",
    correctFeedback: "Correct!",
    incorrectFeedback: "Incorrect.",
    correctAnswer: "Correct answer:",
    octaveLabel: "オクターブ",
    keyboard: "キーボード",
    keyboardHelp: "鍵盤をタップして音程を確認できます。",
    showKeyboard: "キーボードを表示",
    closeKeyboard: "キーボードを閉じる",
    intervalBreakdown: "Interval Breakdown",
    resetStats: "統計をリセット",
    soundEffects: "効果音",
    on: "ON",
    off: "OFF",
  },
};

const INTERVALS: Interval[] = [
  { id: "m2", semitones: 1 },
  { id: "M2", semitones: 2 },
  { id: "m3", semitones: 3 },
  { id: "M3", semitones: 4 },
  { id: "P4", semitones: 5 },
  { id: "b5", semitones: 6 },
  { id: "P5", semitones: 7 },
  { id: "#5", semitones: 8 },
  { id: "M6", semitones: 9 },
  { id: "m7", semitones: 10 },
  { id: "M7", semitones: 11 },
  { id: "P8", semitones: 12 },
];

const PRESETS: Record<PresetKey, string[]> = {
  beginner: ["M3", "P5", "P8"],
  basic: ["M2", "M3", "P4", "P5", "M6", "M7", "P8"],
  jazzIntro: ["m2", "M2", "m3", "M3", "P4", "b5", "P5", "#5", "M6", "m7", "M7", "P8"],
};

const NOTE_LENGTHS: Record<NoteLengthKey, number> = {
  short: 0.6,
  medium: 1.0,
  long: 2.0,
};

const KEYBOARD_MIN_MIDI = 60; // C4
const KEYBOARD_MAX_MIDI = 84; // C6
const WHITE_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_KEY_WIDTH = 48;
const BLACK_KEY_WIDTH = Math.round(WHITE_KEY_WIDTH * 0.62);

function createInitialIntervalStats(): Record<string, { asked: number; answered: number; correct: number }> {
  return Object.fromEntries(
    INTERVALS.map((interval) => [interval.id, { asked: 0, answered: 0, correct: 0 }]),
  ) as Record<string, { asked: number; answered: number; correct: number }>;
}

function matchesPresetSelection(selectedIds: string[], presetIds: string[]): boolean {
  if (selectedIds.length !== presetIds.length) {
    return false;
  }

  const selectedSet = new Set(selectedIds);
  return presetIds.every((id) => selectedSet.has(id));
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resolveDirection(setting: DirectionSetting): ResolvedDirection {
  if (setting === "random") {
    return Math.random() < 0.5 ? "ascending" : "descending";
  }

  return setting;
}

function playedBaseDistance(
  answerSemitones: number,
  mode: TrainingMode,
  direction: ResolvedDirection,
): number {
  if (mode === "melodic" && direction === "descending") {
    if (answerSemitones === 12) {
      return 12;
    }

    const downwardDistance = (12 - answerSemitones) % 12;
    return downwardDistance === 0 ? 12 : downwardDistance;
  }

  return answerSemitones;
}

function distanceOptions(baseSemitones: number, maxRange: 12 | 24): number[] {
  if (baseSemitones === 12) {
    return maxRange === 24 ? [12, 24] : [12];
  }

  if (maxRange === 24 && baseSemitones + 12 <= 24) {
    return [baseSemitones, baseSemitones + 12];
  }

  return [baseSemitones];
}

function intervalDisplayLabel(intervalId: string, language: Language): string {
  if (intervalId === "m2") {
    return "b2";
  }

  if (intervalId === "m7") {
    return "b7";
  }

  if (intervalId === "P8") {
    return I18N[language].octaveLabel;
  }

  return intervalId;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function degreeLabelFromRoot(rootMidi: number, targetMidi: number): string {
  const diff = ((targetMidi - rootMidi) % 12 + 12) % 12;
  const labels = ["R", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
  return labels[diff];
}

function useSfx(enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(async (): Promise<AudioContext | null> => {
    if (!enabled || typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, [enabled]);

  const playTone = useCallback(
    (
      audioContext: AudioContext,
      frequency: number,
      startTime: number,
      duration: number,
      type: OscillatorType = "sine",
      volume = 0.35,
    ) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    },
    [],
  );

  const playCorrect = useCallback(async () => {
    try {
      const audioContext = await ensureContext();
      if (!audioContext) {
        return;
      }

      const now = audioContext.currentTime;
      playTone(audioContext, 880, now, 0.09, "sine", 0.3);
      playTone(audioContext, 1174.66, now + 0.1, 0.12, "sine", 0.33);
    } catch {
      // Avoid UI-breaking errors on unsupported/restricted audio contexts.
    }
  }, [ensureContext, playTone]);

  const playWrong = useCallback(async () => {
    try {
      const audioContext = await ensureContext();
      if (!audioContext) {
        return;
      }

      const now = audioContext.currentTime;
      playTone(audioContext, 220, now, 0.14, "square", 0.18);
      playTone(audioContext, 180, now + 0.11, 0.16, "sine", 0.15);
    } catch {
      // Avoid UI-breaking errors on unsupported/restricted audio contexts.
    }
  }, [ensureContext, playTone]);

  return { ensureContext, playCorrect, playWrong };
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedIntervalIds, setSelectedIntervalIds] = useState<string[]>(PRESETS.basic);
  const [maxRange, setMaxRange] = useState<12 | 24>(12);
  const [mode, setMode] = useState<TrainingMode>("melodic");
  const [directionSetting, setDirectionSetting] = useState<DirectionSetting>("random");
  const [noteLength, setNoteLength] = useState<NoteLengthKey>("short");
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AppTab>("practice");
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(true);

  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [resultStatus, setResultStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [resultAnswerLabel, setResultAnswerLabel] = useState<string>("");
  const [answered, setAnswered] = useState<boolean>(false);
  const [submittedChoiceId, setSubmittedChoiceId] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [correct, setCorrect] = useState<number>(0);
  const [intervalStats, setIntervalStats] = useState<Record<string, { asked: number; answered: number; correct: number }>>(
    createInitialIntervalStats,
  );
  const keyboardScrollRef = useRef<HTMLDivElement | null>(null);

  const t = I18N[language];
  const { ensureContext, playCorrect, playWrong } = useSfx(sfxEnabled);

  const questionPool = useMemo(
    () => INTERVALS.filter((interval) => selectedIntervalIds.includes(interval.id)),
    [selectedIntervalIds],
  );

  const keyboardWhiteKeys = useMemo(
    () =>
      Array.from({ length: KEYBOARD_MAX_MIDI - KEYBOARD_MIN_MIDI + 1 }, (_, index) => KEYBOARD_MIN_MIDI + index)
        .filter((midi) => WHITE_SEMITONES.has(midi % 12)),
    [],
  );

  const keyboardBlackKeys = useMemo(
    () =>
      Array.from({ length: KEYBOARD_MAX_MIDI - KEYBOARD_MIN_MIDI + 1 }, (_, index) => KEYBOARD_MIN_MIDI + index)
        .filter((midi) => !WHITE_SEMITONES.has(midi % 12))
        .map((midi) => ({
          midi,
          whiteCountBefore: keyboardWhiteKeys.filter((whiteMidi) => whiteMidi < midi).length,
        })),
    [keyboardWhiteKeys],
  );

  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : "0.0";

  const playSingleNote = async (midi: number) => {
    const duration = NOTE_LENGTHS[noteLength];
    const audioContext = new window.AudioContext();
    await audioContext.resume();

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(midiToFrequency(midi), now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    setTimeout(() => {
      void audioContext.close();
    }, (duration + 0.1) * 1000);
  };

  const createRound = (): Round | null => {
    if (questionPool.length === 0) {
      setCurrentRound(null);
      return null;
    }

    for (let i = 0; i < 40; i += 1) {
      const nextAnswer = pickRandom(questionPool);
      const nextDirection = resolveDirection(directionSetting);
      const baseDistance = playedBaseDistance(nextAnswer.semitones, mode, nextDirection);
      const possibleDistances = distanceOptions(baseDistance, maxRange).filter(
        (distance) => distance <= KEYBOARD_MAX_MIDI - KEYBOARD_MIN_MIDI,
      );

      if (possibleDistances.length === 0) {
        continue;
      }

      const nextDistance = pickRandom(possibleDistances);

      let note1Min = KEYBOARD_MIN_MIDI;
      let note1Max = KEYBOARD_MAX_MIDI;

      if (mode === "melodic" && nextDirection === "descending") {
        note1Min = KEYBOARD_MIN_MIDI + nextDistance;
        note1Max = KEYBOARD_MAX_MIDI;
      } else {
        note1Min = KEYBOARD_MIN_MIDI;
        note1Max = KEYBOARD_MAX_MIDI - nextDistance;
      }

      if (note1Min > note1Max) {
        continue;
      }

      const note1 = pickRandomInt(note1Min, note1Max);
      const note2 =
        mode === "melodic"
          ? nextDirection === "ascending"
            ? note1 + nextDistance
            : note1 - nextDistance
          : note1 + nextDistance;

      const round: Round = {
        answerId: nextAnswer.id,
        distance: nextDistance,
        direction: nextDirection,
        note1Midi: note1,
        note2Midi: note2,
      };

      setCurrentRound(round);
      setIntervalStats((prev) => ({
        ...prev,
        [nextAnswer.id]: {
          asked: (prev[nextAnswer.id]?.asked ?? 0) + 1,
          answered: prev[nextAnswer.id]?.answered ?? 0,
          correct: prev[nextAnswer.id]?.correct ?? 0,
        },
      }));
      setResultStatus("idle");
      setResultAnswerLabel("");
      setAnswered(false);
      setSubmittedChoiceId(null);

      return round;
    }

    setCurrentRound(null);
    return null;
  };

  const getRound = (): Round | null => {
    if (!currentRound || !questionPool.some((interval) => interval.id === currentRound.answerId)) {
      return createRound();
    }

    return currentRound;
  };

  const playInterval = async () => {
    await ensureContext();

    const round = getRound();
    if (!round) {
      return;
    }

    const audioContext = new window.AudioContext();
    await audioContext.resume();

    const now = audioContext.currentTime;
    const noteDuration = NOTE_LENGTHS[noteLength];
    const gap = 0.15;

    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const note1Freq = midiToFrequency(round.note1Midi);
    const note2Freq = midiToFrequency(round.note2Midi);

    if (mode === "harmony") {
      playNote(note1Freq, now, noteDuration);
      playNote(note2Freq, now, noteDuration);
      setTimeout(() => {
        void audioContext.close();
      }, (noteDuration + 0.1) * 1000);
      return;
    }

    playNote(note1Freq, now, noteDuration);
    playNote(note2Freq, now + noteDuration + gap, noteDuration);

    setTimeout(() => {
      void audioContext.close();
    }, (noteDuration * 2 + gap + 0.1) * 1000);
  };

  const checkAnswer = (selected: Interval) => {
    if (answered) {
      return;
    }

    const round = getRound();
    if (!round) {
      return;
    }

    const isCorrect = selected.id === round.answerId;
    const answerLabel = intervalDisplayLabel(round.answerId, language);

    setSubmittedChoiceId(selected.id);
    setTotal((prev) => prev + 1);
    setIntervalStats((prev) => ({
      ...prev,
      [round.answerId]: {
        asked: prev[round.answerId]?.asked ?? 0,
        answered: (prev[round.answerId]?.answered ?? 0) + 1,
        correct: prev[round.answerId]?.correct ?? 0,
      },
    }));

    if (isCorrect) {
      setCorrect((prev) => prev + 1);
      setIntervalStats((prev) => ({
        ...prev,
        [round.answerId]: {
          asked: prev[round.answerId]?.asked ?? 0,
          answered: prev[round.answerId]?.answered ?? 0,
          correct: (prev[round.answerId]?.correct ?? 0) + 1,
        },
      }));
      setResultStatus("correct");
      setResultAnswerLabel("");
      void playCorrect();
    } else {
      setResultStatus("incorrect");
      setResultAnswerLabel(answerLabel);
      void playWrong();
    }

    setAnswered(true);
  };

  const nextRound = () => {
    void createRound();
  };

  const toggleInterval = (intervalId: string) => {
    setSelectedIntervalIds((prev) => {
      if (prev.includes(intervalId)) {
        return prev.filter((id) => id !== intervalId);
      }

      return [...prev, intervalId];
    });

    setResultStatus("idle");
    setResultAnswerLabel("");
    setAnswered(false);
    setSubmittedChoiceId(null);
  };

  const applyPreset = (preset: PresetKey) => {
    setSelectedIntervalIds(PRESETS[preset]);
    setResultStatus("idle");
    setResultAnswerLabel("");
    setAnswered(false);
    setSubmittedChoiceId(null);
  };

  const updateRange = (range: 12 | 24) => {
    setMaxRange(range);
    setResultStatus("idle");
    setResultAnswerLabel("");
    setAnswered(false);
    setSubmittedChoiceId(null);
  };

  const buttonClass = (intervalId: string): string => {
    const base =
      "rounded-md border border-[var(--border)] px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--card)]";

    if (!answered || !currentRound) {
      return `${base} hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]`;
    }

    if (intervalId === currentRound.answerId) {
      return `${base} border-[var(--correct-border)] bg-[var(--correct-bg)] text-[var(--correct-text)]`;
    }

    if (submittedChoiceId === intervalId) {
      return `${base} border-[var(--incorrect-border)] bg-[var(--incorrect)] text-[var(--text)]`;
    }

    return `${base} bg-[var(--card)] text-[var(--text)]`;
  };

  const activePreset = useMemo<PresetKey | null>(() => {
    if (matchesPresetSelection(selectedIntervalIds, PRESETS.beginner)) {
      return "beginner";
    }

    if (matchesPresetSelection(selectedIntervalIds, PRESETS.basic)) {
      return "basic";
    }

    if (matchesPresetSelection(selectedIntervalIds, PRESETS.jazzIntro)) {
      return "jazzIntro";
    }

    return null;
  }, [selectedIntervalIds]);

  const presetButtonClass = (preset: PresetKey): string => {
    if (activePreset === preset) {
      return "rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--bg)]";
    }

    return "rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]";
  };

  const keyboardWidth = keyboardWhiteKeys.length * WHITE_KEY_WIDTH;
  const keyStartOffsetByMidi = useMemo(() => {
    const offsets = new Map<number, number>();

    keyboardWhiteKeys.forEach((midi, index) => {
      offsets.set(midi, index * WHITE_KEY_WIDTH);
    });

    keyboardBlackKeys.forEach((key) => {
      offsets.set(key.midi, key.whiteCountBefore * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2);
    });

    return offsets;
  }, [keyboardBlackKeys, keyboardWhiteKeys]);

  useEffect(() => {
    if (activeTab !== "practice" || !answered || !currentRound || !keyboardVisible) {
      return;
    }

    const scrollContainer = keyboardScrollRef.current;
    if (!scrollContainer) {
      return;
    }

    const anchorMidi = Math.min(currentRound.note1Midi, currentRound.note2Midi);
    const anchorOffset = keyStartOffsetByMidi.get(anchorMidi);
    if (anchorOffset === undefined) {
      return;
    }

    const targetLeft = Math.max(0, anchorOffset - 12);
    const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);

    scrollContainer.scrollTo({
      left: Math.min(targetLeft, maxScrollLeft),
      behavior: "smooth",
    });
  }, [
    activeTab,
    answered,
    currentRound,
    keyboardVisible,
    keyStartOffsetByMidi,
  ]);

  const breakdownCardClass = (answeredCount: number, accuracyValue: number): string => {
    if (answeredCount === 0) {
      return "border-[var(--border)] bg-[color-mix(in_oklab,var(--text)_6%,transparent)] text-[var(--text)]";
    }

    if (accuracyValue >= 80) {
      return "border-[var(--correct-border)] bg-[var(--correct-bg)] text-[var(--correct-text)]";
    }

    if (accuracyValue >= 50) {
      return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]";
    }

    return "border-[var(--incorrect-border)] bg-[var(--incorrect)] text-[var(--text)]";
  };

  const resetStats = () => {
    setTotal(0);
    setCorrect(0);
    setIntervalStats(createInitialIntervalStats());
  };

  const tabButtonClass = (tab: AppTab): string => {
    if (activeTab === tab) {
      return "rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--bg)]";
    }

    return "rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)]";
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 text-[var(--text)]">
      <h1 className="text-center text-3xl font-bold">{t.title}</h1>

      <div className="mt-8 flex flex-1 flex-col gap-8">
        {activeTab === "settings" && (
          <>
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.systemSettings}</h2>

        <div className="mt-4 grid items-start gap-x-6 gap-y-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.language}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  language === "en"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ja")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  language === "ja"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                JA
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.soundEffects}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSfxEnabled(true)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  sfxEnabled
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.on}
              </button>
              <button
                type="button"
                onClick={() => setSfxEnabled(false)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  !sfxEnabled
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.off}
              </button>
            </div>
          </div>
        </div>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.practiceSettings}</h2>

        <div className="mt-4 grid items-start gap-x-6 gap-y-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.presets}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("beginner")}
                className={presetButtonClass("beginner")}
              >
                {t.beginner}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("basic")}
                className={presetButtonClass("basic")}
              >
                {t.basic}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("jazzIntro")}
                className={presetButtonClass("jazzIntro")}
              >
                {t.jazzIntro}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.noteLength}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setNoteLength("short")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  noteLength === "short"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.short}
              </button>
              <button
                type="button"
                onClick={() => setNoteLength("medium")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  noteLength === "medium"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.medium}
              </button>
              <button
                type="button"
                onClick={() => setNoteLength("long")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  noteLength === "long"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.long}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.maxRange}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => updateRange(12)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  maxRange === 12
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.oneOctave}
              </button>
              <button
                type="button"
                onClick={() => updateRange(24)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  maxRange === 24
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.twoOctaves}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{t.rangeHelp}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.direction}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDirectionSetting("ascending")}
                disabled={mode === "harmony"}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  directionSetting === "ascending"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {t.ascending}
              </button>
              <button
                type="button"
                onClick={() => setDirectionSetting("descending")}
                disabled={mode === "harmony"}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  directionSetting === "descending"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {t.descending}
              </button>
              <button
                type="button"
                onClick={() => setDirectionSetting("random")}
                disabled={mode === "harmony"}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  directionSetting === "random"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {t.random}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.mode}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("melodic")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "melodic"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.melodic}
              </button>
              <button
                type="button"
                onClick={() => setMode("harmony")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "harmony"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                }`}
              >
                {t.harmony}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-line text-xs text-[var(--muted)]">{t.modeHelp}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t.intervalPool}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {INTERVALS.map((interval) => {
              const isSelected = selectedIntervalIds.includes(interval.id);

              return (
                <button
                  key={interval.id}
                  type="button"
                  onClick={() => toggleInterval(interval.id)}
                  aria-pressed={isSelected}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--card)] ${
                    isSelected
                      ? "border-[var(--ref-border)] bg-[var(--ref-bg)] text-[var(--ref-text)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                  }`}
                >
                  {intervalDisplayLabel(interval.id, language)}
                </button>
              );
            })}
          </div>
        </div>
            </section>
          </>
        )}

        {activeTab === "practice" && (
          <>
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.practice}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{t.practiceHelp}</p>

        <button
          type="button"
          onClick={playInterval}
          disabled={questionPool.length === 0}
          className="mt-5 rounded-md bg-[var(--accent)] px-5 py-3 font-medium text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.play}
        </button>

        {questionPool.length === 0 ? (
          <p className="mt-5 rounded-md bg-[color-mix(in_oklab,var(--text)_6%,transparent)] p-3 text-sm">{t.selectOne}</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {questionPool.map((interval) => (
              <button
                key={interval.id}
                type="button"
                disabled={answered}
                onClick={() => checkAnswer(interval)}
                className={buttonClass(interval.id)}
              >
                {intervalDisplayLabel(interval.id, language)}
              </button>
            ))}
          </div>
        )}

        {resultStatus !== "idle" && (
          <div className="mt-4 mb-1">
            {resultStatus === "correct" && (
              <p className="text-xl font-semibold text-[var(--correct-text)]">✓ Correct</p>
            )}
            {resultStatus === "incorrect" && (
              <div className="space-y-1">
                <p className="text-[1.1rem] font-semibold text-[#dc2626]">✗ Incorrect</p>
                <p className="text-sm font-medium">
                  <span className="text-[var(--muted)]">Correct answer: </span>
                  <span className="font-semibold text-[var(--correct-text)]">{resultAnswerLabel}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {answered && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={nextRound}
              className="rounded-md border border-[var(--accent)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            >
              {t.nextInterval}
            </button>

            {currentRound && !keyboardVisible && (
              <button
                type="button"
                onClick={() => setKeyboardVisible(true)}
                className="rounded-md border border-[var(--accent)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--accent)] hover:text-[var(--bg)]"
              >
                {t.showKeyboard}
              </button>
            )}
          </div>
        )}
            </section>

        {answered && currentRound && keyboardVisible && (
          <section className="relative left-1/2 mt-4 w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] px-2 py-4 shadow-sm sm:left-0 sm:w-auto sm:max-w-none sm:translate-x-0 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
            <h2 className="text-xl font-semibold">{t.keyboard}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">{t.keyboardHelp}</p>
              </div>
              <button
                type="button"
                onClick={() => setKeyboardVisible(false)}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-lg leading-none text-[var(--muted)] transition hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
                aria-label={t.closeKeyboard}
              >
                ×
              </button>
            </div>

            <div ref={keyboardScrollRef} className="mt-4 w-full overflow-x-auto">
                <div
                  className="relative h-[220px] overflow-hidden rounded-md bg-[color-mix(in_oklab,var(--text)_3%,transparent)]"
                  style={{
                    width: `${keyboardWidth}px`,
                    minWidth: `${keyboardWidth}px`,
                    border: "1px solid var(--keyboard-border)",
                  }}
                >
                <div className="absolute inset-0 flex">
                  {keyboardWhiteKeys.map((midi, index) => {
                    const isNote1 = midi === currentRound.note1Midi;
                    const isNote2 = midi === currentRound.note2Midi;
                    const keyStateClass = isNote1
                      ? "bg-[var(--ref-bg)]"
                      : isNote2
                        ? "bg-[var(--correct-bg)]"
                        : "bg-white";
                    const degreeLabel = degreeLabelFromRoot(currentRound.note1Midi, midi);
                    const labelClass = isNote1
                      ? "text-[var(--ref-text)]"
                      : isNote2
                        ? "text-[var(--correct-text)]"
                        : "text-zinc-800";

                    return (
                      <button
                        key={midi}
                        type="button"
                        onClick={() => void playSingleNote(midi)}
                        className={`relative h-full flex-1 ${keyStateClass}`}
                        style={{
                          width: `${WHITE_KEY_WIDTH}px`,
                          minWidth: `${WHITE_KEY_WIDTH}px`,
                          boxShadow:
                            index < keyboardWhiteKeys.length - 1
                              ? "inset -1px 0 0 var(--keyboard-border)"
                              : "none",
                        }}
                        aria-label={`key-${midi}`}
                      >
                        <span
                          className={`pointer-events-none absolute left-1/2 top-[75%] -translate-x-1/2 -translate-y-1/2 text-[16px] font-medium leading-none ${labelClass}`}
                        >
                          {degreeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {keyboardBlackKeys.map((key) => {
                  const isNote1 = key.midi === currentRound.note1Midi;
                  const isNote2 = key.midi === currentRound.note2Midi;
                  const keyStateClass = isNote1
                    ? "bg-[var(--ref-bg)]"
                    : isNote2
                      ? "bg-[var(--correct-bg)]"
                      : "bg-black";
                  const degreeLabel = degreeLabelFromRoot(currentRound.note1Midi, key.midi);
                  const labelClass = isNote1
                    ? "text-[var(--ref-text)]"
                    : isNote2
                      ? "text-[var(--correct-text)]"
                      : "text-white";

                  return (
                    <button
                      key={key.midi}
                      type="button"
                      onClick={() => void playSingleNote(key.midi)}
                      className={`absolute top-0 z-10 h-[58%] -translate-x-1/2 rounded-b ${keyStateClass}`}
                      style={{
                        left: `${key.whiteCountBefore * WHITE_KEY_WIDTH}px`,
                        width: `${BLACK_KEY_WIDTH}px`,
                        boxShadow:
                          "0 0 0 1px var(--keyboard-border), inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                      }}
                      aria-label={`key-${key.midi}`}
                    >
                      <span
                        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16px] font-medium leading-none ${labelClass}`}
                      >
                        {degreeLabel}
                      </span>
                    </button>
                  );
                })}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 z-10 h-[58%] -translate-x-1/2 rounded-b bg-black"
                  style={{
                    left: `${keyboardWidth}px`,
                    width: `${BLACK_KEY_WIDTH}px`,
                    boxShadow:
                      "0 0 0 1px var(--keyboard-border), inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                  }}
                />
                </div>
            </div>
          </section>
        )}
          </>
        )}

        {activeTab === "stats" && (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.stats}</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-[color-mix(in_oklab,var(--text)_6%,transparent)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{t.total}</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
          <div className="rounded-md bg-[color-mix(in_oklab,var(--text)_6%,transparent)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{t.correct}</div>
            <div className="text-2xl font-bold">{correct}</div>
          </div>
          <div className="rounded-md bg-[color-mix(in_oklab,var(--text)_6%,transparent)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{t.accuracy}</div>
            <div className="text-2xl font-bold">{accuracy}%</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{t.intervalBreakdown}</h3>
          <button
            type="button"
            onClick={resetStats}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
          >
            {t.resetStats}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {INTERVALS.map((interval) => {
            const stat = intervalStats[interval.id] ?? { asked: 0, answered: 0, correct: 0 };
            const intervalAccuracy = stat.answered > 0 ? (stat.correct / stat.answered) * 100 : 0;
            const accuracyLabel = stat.answered > 0 ? `${intervalAccuracy.toFixed(1)}%` : "—";

            return (
              <div
                key={interval.id}
                className={`rounded-md border p-3 ${breakdownCardClass(stat.answered, intervalAccuracy)}`}
              >
                <div className="text-sm font-semibold">{intervalDisplayLabel(interval.id, language)}</div>
                <div className="mt-2 text-xs opacity-80">
                  {t.total}: {stat.asked}
                </div>
                <div className="text-xs opacity-80">
                  {t.correct}: {stat.correct}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {t.accuracy}: {accuracyLabel}
                </div>
              </div>
            );
          })}
        </div>
          </section>
        )}

        <nav className="sticky bottom-0 z-20 mt-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] p-2 shadow-sm backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className={tabButtonClass("practice")} onClick={() => setActiveTab("practice")}>
              {t.practice}
            </button>
            <button type="button" className={tabButtonClass("stats")} onClick={() => setActiveTab("stats")}>
              {t.stats}
            </button>
            <button type="button" className={tabButtonClass("settings")} onClick={() => setActiveTab("settings")}>
              {t.settings}
            </button>
          </div>
        </nav>
      </div>
    </main>
  );
}
