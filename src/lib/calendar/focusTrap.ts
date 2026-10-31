/**
 * Traps Tab key navigation within a modal container for accessibility (WCAG).
 */
export function handleModalTabLoop(
  e: KeyboardEvent,
  container: HTMLElement | null
): void {
  if (e.key !== "Tab" || !container) return;

  const focusables = container.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

