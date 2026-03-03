const VIRTUAL_TODAY_ENABLED_KEY = "virtualTodayEnabled";
const VIRTUAL_TODAY_DATE_KEY = "virtualDateKey";

export type VirtualTodayState = {
  enabled: boolean;
  dateKey: string;
};

function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production";
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

function parseDateKey(dateKey: string): Date | null {
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

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getVirtualTodayState(): VirtualTodayState {
  const storage = getStorage();
  const todayKey = formatDateKey(new Date());

  if (isProductionBuild() || !storage) {
    return {
      enabled: false,
      dateKey: todayKey,
    };
  }

  const enabled = storage.getItem(VIRTUAL_TODAY_ENABLED_KEY) === "true";
  const storedDateKey = storage.getItem(VIRTUAL_TODAY_DATE_KEY) ?? todayKey;
  const parsed = parseDateKey(storedDateKey);

  return {
    enabled: enabled && parsed !== null,
    dateKey: parsed ? formatDateKey(parsed) : todayKey,
  };
}

export function setVirtualTodayEnabled(enabled: boolean): void {
  if (isProductionBuild()) {
    return;
  }
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(VIRTUAL_TODAY_ENABLED_KEY, enabled ? "true" : "false");
}

export function setVirtualTodayDateKey(dateKey: string): boolean {
  if (isProductionBuild()) {
    return false;
  }
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return false;
  }
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  storage.setItem(VIRTUAL_TODAY_DATE_KEY, formatDateKey(parsed));
  return true;
}

export function getTodayDate(): Date {
  if (isProductionBuild()) {
    return new Date();
  }

  const state = getVirtualTodayState();
  if (!state.enabled) {
    return new Date();
  }

  return parseDateKey(state.dateKey) ?? new Date();
}

export function getTodayKey(): string {
  return formatDateKey(getTodayDate());
}
