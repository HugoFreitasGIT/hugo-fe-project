"use client";

type RetryButtonProps = {
  onRetry: () => void;
};

export default function RetryButton({ onRetry }: RetryButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onRetry()}
      className="inline-flex items-center bg-ink px-6 py-3 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
    >
      Try again
    </button>
  );
}
