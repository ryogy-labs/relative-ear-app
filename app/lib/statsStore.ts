export type IntervalStatsCounter = {
  answered: number;
  correct: number;
};

export type StatsBucket = {
  totalAnswered: number;
  totalCorrect: number;
  byInterval: Record<string, IntervalStatsCounter>;
};

export type StatsStore = {
  version: 1;
  allTime: StatsBucket;
  daily: Record<string, StatsBucket>;
};

const STATS_STORAGE_KEY = "ryogyLabStatsV1";

type PreferencesGetResult = { value: string | null };
type PreferencesPlugin = {
  get(options: { key: string }): Promise<PreferencesGetResult>;
  set(options: { key: string; value: string }): Promise<void>;
};

function getCapacitorPreferences(): PreferencesPlugin | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const maybeCapacitor = (globalThis as { Capacitor?: { Plugins?: { Preferences?: PreferencesPlugin } } }).Capacitor;
  return maybeCapacitor?.Plugins?.Preferences ?? null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function sanitizeCounter(value: unknown): IntervalStatsCounter {
  const record = toRecord(value);
  return {
    answered: toNumber(record?.answered),
    correct: toNumber(record?.correct),
  };
}

function sanitizeBucket(value: unknown): StatsBucket {
  const record = toRecord(value);
  const byIntervalRecord = toRecord(record?.byInterval) ?? {};
  const byInterval: Record<string, IntervalStatsCounter> = {};

  Object.entries(byIntervalRecord).forEach(([intervalId, counter]) => {
    byInterval[intervalId] = sanitizeCounter(counter);
  });

  return {
    totalAnswered: toNumber(record?.totalAnswered),
    totalCorrect: toNumber(record?.totalCorrect),
    byInterval,
  };
}

export function parseDateKeyToLocalDate(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function createEmptyStatsStore(): StatsStore {
  return {
    version: 1,
    allTime: {
      totalAnswered: 0,
      totalCorrect: 0,
      byInterval: {},
    },
    daily: {},
  };
}

export function incrementStatsForAnswer(
  store: StatsStore,
  intervalId: string,
  isCorrect: boolean,
  dateKey: string,
): StatsStore {
  const allTimeCounter = store.allTime.byInterval[intervalId] ?? { answered: 0, correct: 0 };
  const nextAllTimeByInterval = {
    ...store.allTime.byInterval,
    [intervalId]: {
      answered: allTimeCounter.answered + 1,
      correct: allTimeCounter.correct + (isCorrect ? 1 : 0),
    },
  };

  const dayBucket = store.daily[dateKey] ?? {
    totalAnswered: 0,
    totalCorrect: 0,
    byInterval: {},
  };
  const dayCounter = dayBucket.byInterval[intervalId] ?? { answered: 0, correct: 0 };
  const nextDayBucket: StatsBucket = {
    totalAnswered: dayBucket.totalAnswered + 1,
    totalCorrect: dayBucket.totalCorrect + (isCorrect ? 1 : 0),
    byInterval: {
      ...dayBucket.byInterval,
      [intervalId]: {
        answered: dayCounter.answered + 1,
        correct: dayCounter.correct + (isCorrect ? 1 : 0),
      },
    },
  };

  return {
    version: 1,
    allTime: {
      totalAnswered: store.allTime.totalAnswered + 1,
      totalCorrect: store.allTime.totalCorrect + (isCorrect ? 1 : 0),
      byInterval: nextAllTimeByInterval,
    },
    daily: {
      ...store.daily,
      [dateKey]: nextDayBucket,
    },
  };
}

export function aggregateDailyRange(store: StatsStore, startDate: Date, endDate: Date): StatsBucket {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const result: StatsBucket = {
    totalAnswered: 0,
    totalCorrect: 0,
    byInterval: {},
  };

  Object.entries(store.daily).forEach(([dateKey, dayBucket]) => {
    const localDate = parseDateKeyToLocalDate(dateKey);
    if (!localDate) {
      return;
    }
    const ms = localDate.getTime();
    if (ms < startMs || ms > endMs) {
      return;
    }

    result.totalAnswered += dayBucket.totalAnswered;
    result.totalCorrect += dayBucket.totalCorrect;

    Object.entries(dayBucket.byInterval).forEach(([intervalId, counter]) => {
      const existing = result.byInterval[intervalId] ?? { answered: 0, correct: 0 };
      result.byInterval[intervalId] = {
        answered: existing.answered + counter.answered,
        correct: existing.correct + counter.correct,
      };
    });
  });

  return result;
}

async function readRawStats(): Promise<string | null> {
  const preferences = getCapacitorPreferences();
  if (preferences) {
    try {
      const result = await preferences.get({ key: STATS_STORAGE_KEY });
      return result.value;
    } catch {
      // Fall back to localStorage
    }
  }

  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STATS_STORAGE_KEY);
}

async function writeRawStats(value: string): Promise<void> {
  const preferences = getCapacitorPreferences();
  if (preferences) {
    try {
      await preferences.set({ key: STATS_STORAGE_KEY, value });
      return;
    } catch {
      // Fall back to localStorage
    }
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STATS_STORAGE_KEY, value);
  }
}

export async function loadStats(): Promise<StatsStore> {
  const raw = await readRawStats();
  if (!raw) {
    return createEmptyStatsStore();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const record = toRecord(parsed);
    if (!record) {
      return createEmptyStatsStore();
    }

    const dailyRecord = toRecord(record.daily) ?? {};
    const daily: Record<string, StatsBucket> = {};
    Object.entries(dailyRecord).forEach(([dateKey, bucket]) => {
      daily[dateKey] = sanitizeBucket(bucket);
    });

    return {
      version: 1,
      allTime: sanitizeBucket(record.allTime),
      daily,
    };
  } catch {
    return createEmptyStatsStore();
  }
}

export async function saveStats(store: StatsStore): Promise<void> {
  await writeRawStats(JSON.stringify(store));
}
