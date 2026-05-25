export const ACTIVE_SEDE_STORAGE_KEY = 'active_sede_id';
export const ACTIVE_SEDE_CHANGED_EVENT = 'active-sede-changed';

export const getStoredActiveSedeId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_SEDE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredActiveSedeId = (id: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (id) localStorage.setItem(ACTIVE_SEDE_STORAGE_KEY, id);
    else localStorage.removeItem(ACTIVE_SEDE_STORAGE_KEY);
  } catch {}

  window.dispatchEvent(
    new CustomEvent(ACTIVE_SEDE_CHANGED_EVENT, {
      detail: { activeSedeId: id },
    })
  );
};

export const clearStoredActiveSedeId = () => setStoredActiveSedeId(null);