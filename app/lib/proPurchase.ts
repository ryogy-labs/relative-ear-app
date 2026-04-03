/// <reference types="cordova-plugin-purchase" />

import { Capacitor } from "@capacitor/core";

import { getIsPro, setIsPro } from "./entitlements";

export const PRO_PRODUCT_ID = "com.ryogy.relativepitch.pro.v2";
const PLUGIN_WAIT_TIMEOUT_MS = 5000;
const PURCHASE_WAIT_TIMEOUT_MS = 30000;
const RESTORE_CALL_TIMEOUT_MS = 10000;
const RESTORE_RESULT_WAIT_TIMEOUT_MS = 6000;

export type PurchaseOutcomeStatus =
  | "success"
  | "restored"
  | "already-owned"
  | "cancelled"
  | "failed"
  | "unsupported"
  | "nothing-to-restore";

export type PurchaseOutcome = {
  status: PurchaseOutcomeStatus;
  detail?: string;
};

export type ProPurchaseState = {
  isNativeIOS: boolean;
  isInitialized: boolean;
  isBusy: boolean;
  isPro: boolean;
  canRestore: boolean;
};

type PurchaseListener = (state: ProPurchaseState) => void;

type PurchaseGlobal = typeof globalThis & {
  CdvPurchase?: typeof CdvPurchase;
};

const listeners = new Set<PurchaseListener>();
let initializePromise: Promise<void> | null = null;
let purchaseStore: CdvPurchase.Store | null = null;
let purchaseNamespace: typeof CdvPurchase | null = null;
let storeConfigured = false;

const state: ProPurchaseState = {
  isNativeIOS: false,
  isInitialized: false,
  isBusy: false,
  isPro: false,
  canRestore: false,
};

function emit(): void {
  const snapshot = { ...state };
  listeners.forEach((listener) => listener(snapshot));
}

function setBusy(isBusy: boolean): void {
  state.isBusy = isBusy;
  emit();
}

function isNativeIOSApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

async function waitForCdvPurchaseNamespace(): Promise<typeof CdvPurchase | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PLUGIN_WAIT_TIMEOUT_MS) {
    const namespace = (globalThis as PurchaseGlobal).CdvPurchase;
    if (namespace?.store) {
      return namespace;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return null;
}

async function syncEntitlementFromStore(): Promise<boolean> {
  const ownedFromStore = purchaseStore ? purchaseStore.owned(PRO_PRODUCT_ID) : false;
  const canTrustStoreOwnership = state.isNativeIOS && purchaseStore !== null;
  const nextIsPro = canTrustStoreOwnership ? ownedFromStore : await getIsPro();
  state.isPro = nextIsPro;
  await setIsPro(nextIsPro);
  emit();
  return nextIsPro;
}

function getRegisteredProduct(): CdvPurchase.Product | undefined {
  if (!purchaseStore || !purchaseNamespace) {
    return undefined;
  }

  return (
    purchaseStore.get(PRO_PRODUCT_ID, purchaseNamespace.Platform.APPLE_APPSTORE) ??
    purchaseStore.get(PRO_PRODUCT_ID)
  );
}

async function waitForOwnership(timeoutMs = PURCHASE_WAIT_TIMEOUT_MS): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await syncEntitlementFromStore()) {
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  return syncEntitlementFromStore();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function configureStore(namespace: typeof CdvPurchase): void {
  if (storeConfigured) {
    return;
  }

  const { store, Platform, ProductType, LogLevel } = namespace;
  purchaseStore = store;
  purchaseNamespace = namespace;
  store.verbosity = LogLevel.ERROR;
  store.register([
    {
      id: PRO_PRODUCT_ID,
      platform: Platform.APPLE_APPSTORE,
      type: ProductType.NON_CONSUMABLE,
    },
  ]);

  store.error((error) => {
    if (error.code === namespace.ErrorCode.PAYMENT_CANCELLED) {
      return;
    }
    console.error("IAP error:", error.message);
  });

  store
    .when()
    .productUpdated(() => {
      void syncEntitlementFromStore();
    })
    .receiptUpdated(() => {
      void syncEntitlementFromStore();
    })
    .receiptsReady(() => {
      state.isInitialized = true;
      emit();
      void syncEntitlementFromStore();
    })
    .approved((transaction) => {
      void transaction.finish().then(() => syncEntitlementFromStore());
    })
    .finished(() => {
      void syncEntitlementFromStore();
    });

  storeConfigured = true;
}

export function subscribeToProPurchaseState(listener: PurchaseListener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getProPurchaseState(): ProPurchaseState {
  return { ...state };
}

export async function initializeProPurchase(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    state.isNativeIOS = isNativeIOSApp();
    state.canRestore = state.isNativeIOS;
    state.isPro = await getIsPro();
    emit();

    if (!state.isNativeIOS) {
      state.isInitialized = true;
      emit();
      return;
    }

    await import("cordova-plugin-purchase/www/store");
    const namespace = await waitForCdvPurchaseNamespace();

    if (!namespace) {
      state.isInitialized = true;
      emit();
      return;
    }

    configureStore(namespace);
    const errors = await namespace.store.initialize([
      {
        platform: namespace.Platform.APPLE_APPSTORE,
        options: {
          needAppReceipt: true,
        },
      },
    ]);

    if (errors.length > 0) {
      console.error("IAP initialize errors:", errors.map((error) => error.message).join(", "));
    }

    await namespace.store.update();
    state.isInitialized = true;
    emit();
    await syncEntitlementFromStore();
  })();

  try {
    await initializePromise;
  } catch (error) {
    state.isInitialized = true;
    emit();
    console.error("IAP initialization failed:", error);
  }
}

export async function purchasePro(): Promise<PurchaseOutcome> {
  await initializeProPurchase();

  if (!state.isNativeIOS || !purchaseStore || !purchaseNamespace) {
    return { status: "unsupported" };
  }

  if (await syncEntitlementFromStore()) {
    return { status: "already-owned" };
  }

  setBusy(true);
  try {
    const product = getRegisteredProduct();
    const offer = product?.getOffer();
    if (!offer) {
      return { status: "failed", detail: "Product offer unavailable" };
    }

    const error = await offer.order();
    if (error) {
      if (error.code === purchaseNamespace.ErrorCode.PAYMENT_CANCELLED) {
        return { status: "cancelled" };
      }
      return { status: "failed", detail: error.message };
    }

    const owned = await waitForOwnership();
    return owned ? { status: "success" } : { status: "failed", detail: "Ownership not confirmed" };
  } finally {
    setBusy(false);
  }
}

export async function restoreProPurchases(): Promise<PurchaseOutcome> {
  await initializeProPurchase();

  if (!state.isNativeIOS || !purchaseStore) {
    return { status: "unsupported" };
  }

  if (await syncEntitlementFromStore()) {
    return { status: "already-owned" };
  }

  setBusy(true);
  try {
    const error = await withTimeout(
      purchaseStore.restorePurchases(),
      RESTORE_CALL_TIMEOUT_MS,
      "Restore request timed out",
    );
    if (error) {
      return { status: "failed", detail: error.message };
    }

    await purchaseStore.update();
    if (await syncEntitlementFromStore()) {
      return { status: "restored" };
    }

    const owned = await waitForOwnership(RESTORE_RESULT_WAIT_TIMEOUT_MS);
    return owned ? { status: "restored" } : { status: "nothing-to-restore" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown restore error";
    return { status: "failed", detail };
  } finally {
    setBusy(false);
  }
}
