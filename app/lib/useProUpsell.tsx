"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProUpsellModal } from "../components/ProUpsellModal";

type ProUpsellCopy = {
  title: string;
  benefits: string[];
  pricingNote: string;
  continueLabel: string;
  notNowLabel: string;
  purchasesComingSoon: string;
};

export function useProUpsell(copy: ProUpsellCopy) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const clearToastTimer = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const openProUpsell = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeProUpsell = useCallback(() => {
    setIsOpen(false);
  }, []);

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      clearToastTimer();
      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, 2200);
    },
    [clearToastTimer],
  );

  const handleContinue = useCallback(() => {
    setIsOpen(false);
    showToast(copy.purchasesComingSoon);
  }, [copy.purchasesComingSoon, showToast]);

  useEffect(
    () => () => {
      clearToastTimer();
    },
    [clearToastTimer],
  );

  const ProUpsellModalNode = (
    <>
      <ProUpsellModal
        open={isOpen}
        title={copy.title}
        benefits={copy.benefits}
        pricingNote={copy.pricingNote}
        continueLabel={copy.continueLabel}
        notNowLabel={copy.notNowLabel}
        onContinue={handleContinue}
        onClose={closeProUpsell}
      />
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm shadow-lg">
          {toastMessage}
        </div>
      )}
    </>
  );

  return { openProUpsell, ProUpsellModalNode };
}
