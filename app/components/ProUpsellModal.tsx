"use client";

type ProUpsellModalProps = {
  open: boolean;
  title: string;
  benefits: string[];
  pricingNote: string;
  continueLabel: string;
  notNowLabel: string;
  restoreLabel?: string;
  isBusy?: boolean;
  showRestore?: boolean;
  onContinue: () => void;
  onRestore?: () => void;
  onClose: () => void;
};

export function ProUpsellModal({
  open,
  title,
  benefits,
  pricingNote,
  continueLabel,
  notNowLabel,
  restoreLabel,
  isBusy = false,
  showRestore = false,
  onContinue,
  onRestore,
  onClose,
}: ProUpsellModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-sm leading-none text-[var(--muted)]"
            aria-label={notNowLabel}
          >
            ×
          </button>
        </div>

        <ul className="mt-3 space-y-2 text-sm text-[var(--text)]">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--accent)]">•</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-[var(--muted)]">{pricingNote}</p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)]"
          >
            {notNowLabel}
          </button>
          {showRestore && onRestore && restoreLabel && (
            <button
              type="button"
              onClick={onRestore}
              disabled={isBusy}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[color-mix(in_oklab,var(--text)_6%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {restoreLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onContinue}
            disabled={isBusy}
            className="rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
