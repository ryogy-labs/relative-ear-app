const PRO_ENTITLEMENT_KEY = "relative-ear.isPro";

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

export async function getIsPro(): Promise<boolean> {
  const preferences = getCapacitorPreferences();

  if (preferences) {
    try {
      const result = await preferences.get({ key: PRO_ENTITLEMENT_KEY });
      return result.value === "true";
    } catch {
      // Fall back to localStorage
    }
  }

  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PRO_ENTITLEMENT_KEY) === "true";
}

export async function setIsPro(value: boolean): Promise<void> {
  const nextValue = value ? "true" : "false";
  const preferences = getCapacitorPreferences();

  if (preferences) {
    try {
      await preferences.set({ key: PRO_ENTITLEMENT_KEY, value: nextValue });
      return;
    } catch {
      // Fall back to localStorage
    }
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(PRO_ENTITLEMENT_KEY, nextValue);
  }
}
