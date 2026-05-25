import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  ACTIVE_SEDE_CHANGED_EVENT,
  clearStoredActiveSedeId,
  getStoredActiveSedeId,
  setStoredActiveSedeId,
} from './activeSede';

describe('active sede storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persiste Arequipa y Moquegua como sedes activas independientes', () => {
    const arequipaId = 'e1646b84-8d38-4ba3-a4a5-10848d71f9b8';
    const moqueguaId = 'c0441a52-6d1b-480f-9f09-d665b0b3bcb1';

    setStoredActiveSedeId(arequipaId);
    expect(getStoredActiveSedeId()).toBe(arequipaId);

    setStoredActiveSedeId(moqueguaId);
    expect(getStoredActiveSedeId()).toBe(moqueguaId);
  });

  it('notifica el cambio en la misma pestaña para que SedeProvider no conserve Moquegua en memoria', () => {
    const arequipaId = 'e1646b84-8d38-4ba3-a4a5-10848d71f9b8';
    const handler = vi.fn();

    window.addEventListener(ACTIVE_SEDE_CHANGED_EVENT, handler);
    setStoredActiveSedeId(arequipaId);
    window.removeEventListener(ACTIVE_SEDE_CHANGED_EVENT, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      detail: { activeSedeId: arequipaId },
    });
  });

  it('limpia la sede activa al cerrar o cambiar sede', () => {
    setStoredActiveSedeId('c0441a52-6d1b-480f-9f09-d665b0b3bcb1');
    clearStoredActiveSedeId();

    expect(getStoredActiveSedeId()).toBeNull();
  });
});