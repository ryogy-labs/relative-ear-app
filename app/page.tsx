"use client";

import { useMemo, useState } from "react";

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
};

const I18N: Record<Language, UiText> = {
  en: {
    title: "Interval Ear Trainer",
    settings: "Settings",
    language: "Language",
    presets: "Presets",
    beginner: "Beginner",
    basic: "Basic",
    jazzIntro: "Jazz Intro",
    maxRange: "Max interval range",
    oneOctave: "1 octave",
    twoOctaves: "2 octaves",
    rangeHelp: "Range controls only the maximum semitone distance between notes.",
    mode: "Mode",
    melodic: "Melodic",
    harmony: "Harmony",
    modeHelp: "Harmony: two notes together, lower note is reference. Melodic: first note is reference.",
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
    practiceHelp: "Listen and pick the interval from your selected pool.",
    play: "Play",
    currentDirection: "Current direction",
    selectOne: "Select at least one interval to start.",
    nextInterval: "Next interval",
    stats: "Stats",
    total: "Total",
    correct: "Correct",
    accuracy: "Accuracy",
    correctFeedback: "Correct",
    incorrectFeedback: "Incorrect",
    correctAnswer: "Correct answer",
    octaveLabel: "Octave",
    keyboard: "Keyboard",
    keyboardHelp: "Tap keys to verify the interval.",
  },
  ja: {
    title: "音程イヤートレーナー",
    settings: "設定",
    language: "言語",
    presets: "プリセット",
    beginner: "初級",
    basic: "ベーシック",
    jazzIntro: "ジャズ入門",
    maxRange: "最大音程範囲",
    oneOctave: "1オクターブ",
    twoOctaves: "2オクターブ",
    rangeHelp: "範囲設定は2音間の最大半音距離のみを制御します。",
    mode: "モード",
    melodic: "メロディック",
    harmony: "ハーモニー",
    modeHelp: "ハーモニー: 同時に2音（低い音が基準）。メロディック: 先に鳴る1音目が基準。",
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
    practiceHelp: "再生して、選択中の音程プールから答えを選んでください。",
    play: "再生",
    currentDirection: "現在の方向",
    selectOne: "少なくとも1つの音程を選択してください。",
    nextInterval: "次の音程",
    stats: "統計",
    total: "総数",
    correct: "正解",
    accuracy: "正答率",
    correctFeedback: "正解",
    incorrectFeedback: "不正解",
    correctAnswer: "正解",
    octaveLabel: "オクターブ",
    keyboard: "キーボード",
    keyboardHelp: "鍵盤をタップして音程を確認できます。",
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

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedIntervalIds, setSelectedIntervalIds] = useState<string[]>(PRESETS.basic);
  const [maxRange, setMaxRange] = useState<12 | 24>(12);
  const [mode, setMode] = useState<TrainingMode>("melodic");
  const [directionSetting, setDirectionSetting] = useState<DirectionSetting>("random");
  const [noteLength, setNoteLength] = useState<NoteLengthKey>("short");

  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [answered, setAnswered] = useState<boolean>(false);
  const [submittedChoiceId, setSubmittedChoiceId] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [correct, setCorrect] = useState<number>(0);

  const t = I18N[language];

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
      setFeedback("");
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
    const round = getRound();
    if (!round) {
      return;
    }

    const isCorrect = selected.id === round.answerId;
    const answerLabel = intervalDisplayLabel(round.answerId, language);

    setSubmittedChoiceId(selected.id);
    setTotal((prev) => prev + 1);

    if (isCorrect) {
      setCorrect((prev) => prev + 1);
      setFeedback(`${t.correctFeedback}: ${answerLabel}`);
    } else {
      setFeedback(`${t.incorrectFeedback}. ${t.correctAnswer}: ${answerLabel}`);
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

    setFeedback("");
    setAnswered(false);
    setSubmittedChoiceId(null);
  };

  const applyPreset = (preset: PresetKey) => {
    setSelectedIntervalIds(PRESETS[preset]);
    setFeedback("");
    setAnswered(false);
    setSubmittedChoiceId(null);
  };

  const updateRange = (range: 12 | 24) => {
    setMaxRange(range);
    setFeedback("");
    setAnswered(false);
    setSubmittedChoiceId(null);
  };

  const buttonClass = (intervalId: string): string => {
    const base =
      "rounded-md border border-black/20 px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-100";

    if (!answered || !currentRound) {
      return `${base} hover:bg-black/5`;
    }

    if (intervalId === currentRound.answerId) {
      return `${base} border-[var(--correct-border)] bg-[var(--correct-bg)] text-[var(--correct-text)]`;
    }

    if (submittedChoiceId === intervalId) {
      return `${base} border-red-600 bg-red-100 text-red-900`;
    }

    return `${base} bg-white text-black`;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <h1 className="text-center text-3xl font-bold">{t.title}</h1>

      <section className="rounded-xl border border-black/10 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.settings}</h2>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.language}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  language === "en" ? "border-black bg-black text-white" : "border-black/20 hover:bg-black/5"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ja")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  language === "ja" ? "border-black bg-black text-white" : "border-black/20 hover:bg-black/5"
                }`}
              >
                JA
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.presets}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("beginner")}
                className="rounded-md border border-black/20 px-3 py-2 text-sm font-medium hover:bg-black/5"
              >
                {t.beginner}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("basic")}
                className="rounded-md border border-black/20 px-3 py-2 text-sm font-medium hover:bg-black/5"
              >
                {t.basic}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("jazzIntro")}
                className="rounded-md border border-black/20 px-3 py-2 text-sm font-medium hover:bg-black/5"
              >
                {t.jazzIntro}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.maxRange}</h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="max-range"
                  checked={maxRange === 12}
                  onChange={() => updateRange(12)}
                />
                {t.oneOctave}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="max-range"
                  checked={maxRange === 24}
                  onChange={() => updateRange(24)}
                />
                {t.twoOctaves}
              </label>
            </div>
            <p className="mt-2 text-xs text-black/60">{t.rangeHelp}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.noteLength}</h3>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setNoteLength("short")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  noteLength === "short" ? "border-black bg-black text-white" : "border-black/20 hover:bg-black/5"
                }`}
              >
                {t.short}
              </button>
              <button
                type="button"
                onClick={() => setNoteLength("medium")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  noteLength === "medium" ? "border-black bg-black text-white" : "border-black/20 hover:bg-black/5"
                }`}
              >
                {t.medium}
              </button>
              <button
                type="button"
                onClick={() => setNoteLength("long")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  noteLength === "long" ? "border-black bg-black text-white" : "border-black/20 hover:bg-black/5"
                }`}
              >
                {t.long}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.mode}</h3>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "melodic"}
                  onChange={() => setMode("melodic")}
                />
                {t.melodic}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "harmony"}
                  onChange={() => setMode("harmony")}
                />
                {t.harmony}
              </label>
            </div>
            <p className="mt-2 text-xs text-black/60">{t.modeHelp}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.direction}</h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="direction"
                  checked={directionSetting === "ascending"}
                  onChange={() => setDirectionSetting("ascending")}
                  disabled={mode === "harmony"}
                />
                {t.ascending}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="direction"
                  checked={directionSetting === "descending"}
                  onChange={() => setDirectionSetting("descending")}
                  disabled={mode === "harmony"}
                />
                {t.descending}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="direction"
                  checked={directionSetting === "random"}
                  onChange={() => setDirectionSetting("random")}
                  disabled={mode === "harmony"}
                />
                {t.random}
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.intervalPool}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {INTERVALS.map((interval) => (
              <label
                key={interval.id}
                className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedIntervalIds.includes(interval.id)}
                  onChange={() => toggleInterval(interval.id)}
                />
                {intervalDisplayLabel(interval.id, language)}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-black/10 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.practice}</h2>
        <p className="mt-2 text-sm text-black/70">{t.practiceHelp}</p>

        <button
          type="button"
          onClick={playInterval}
          disabled={questionPool.length === 0}
          className="mt-5 rounded-md bg-black px-5 py-3 font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/30"
        >
          {t.play}
        </button>

        {mode === "melodic" && currentRound && questionPool.length > 0 && (
          <p className="mt-2 text-xs text-black/60">
            {t.currentDirection}: {directionSetting === "random" ? t.random : t[directionSetting]}
          </p>
        )}

        {questionPool.length === 0 ? (
          <p className="mt-5 rounded-md bg-black/5 p-3 text-sm">{t.selectOne}</p>
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

        <div className="mt-5 min-h-7 text-sm font-medium">{feedback}</div>

        {answered && currentRound && (
          <section className="mt-4 rounded-lg border border-black/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/65">{t.keyboard}</h3>
            <p className="mt-1 text-xs text-black/60">{t.keyboardHelp}</p>

            <div className="mt-4 w-full">
              <div
                className="relative h-[220px] w-full overflow-hidden rounded-md bg-zinc-100/30"
                style={{ border: "1px solid var(--keyboard-border)" }}
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
                        left: `${(key.whiteCountBefore / keyboardWhiteKeys.length) * 100}%`,
                        width: `${(100 / keyboardWhiteKeys.length) * 0.62}%`,
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
                    left: "100%",
                    width: `${(100 / keyboardWhiteKeys.length) * 0.62}%`,
                    boxShadow:
                      "0 0 0 1px var(--keyboard-border), inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {answered && (
          <button
            type="button"
            onClick={nextRound}
            className="mt-4 rounded-md border border-black px-4 py-2 text-sm font-semibold transition hover:bg-black hover:text-white"
          >
            {t.nextInterval}
          </button>
        )}
      </section>

      <section className="rounded-xl border border-black/10 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t.stats}</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-black/5 p-3">
            <div className="text-xs uppercase tracking-wide text-black/60">{t.total}</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
          <div className="rounded-md bg-black/5 p-3">
            <div className="text-xs uppercase tracking-wide text-black/60">{t.correct}</div>
            <div className="text-2xl font-bold">{correct}</div>
          </div>
          <div className="rounded-md bg-black/5 p-3">
            <div className="text-xs uppercase tracking-wide text-black/60">{t.accuracy}</div>
            <div className="text-2xl font-bold">{accuracy}%</div>
          </div>
        </div>
      </section>
    </main>
  );
}
