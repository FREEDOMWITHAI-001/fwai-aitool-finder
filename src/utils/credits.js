const STORAGE_KEY = 'aitf_credits';
const INITIAL_CREDITS = 50;

export function getCredits() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    localStorage.setItem(STORAGE_KEY, String(INITIAL_CREDITS));
    return INITIAL_CREDITS;
  }
  return parseInt(stored, 10);
}

export function useCredit() {
  const current = getCredits();
  if (current <= 0) return 0;
  const newBalance = current - 1;
  localStorage.setItem(STORAGE_KEY, String(newBalance));
  return newBalance;
}

export function hasCredits() {
  return getCredits() > 0;
}

export function resetCredits() {
  localStorage.setItem(STORAGE_KEY, String(INITIAL_CREDITS));
  return INITIAL_CREDITS;
}
