import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SedeProvider, useSedeContext } from './useSedeContext';
import { setStoredActiveSedeId } from '@/lib/activeSede';

const arequipaId = 'e1646b84-8d38-4ba3-a4a5-10848d71f9b8';
const moqueguaId = 'c0441a52-6d1b-480f-9f09-d665b0b3bcb1';

const mockUseUserSedes = vi.fn();

vi.mock('@/hooks/useSedes', () => ({
  useUserSedes: () => mockUseUserSedes(),
}));

const SedeConsumer = () => {
  const { availableSedes, activeSedeId } = useSedeContext();
  const sedeNombre = availableSedes.find((s) => s.id === activeSedeId)?.nombre || 'Sin sede';
  return <div data-testid="active-sede">{sedeNombre}</div>;
};

describe('SedeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseUserSedes.mockReturnValue({
      sedes: [
        { id: arequipaId, nombre: 'Arequipa', codigo: 'AQP', direccion: null, telefono: null, activa: true, orden: 1 },
        { id: moqueguaId, nombre: 'Moquegua', codigo: 'MOQ', direccion: null, telefono: null, activa: true, orden: 2 },
      ],
      canViewAllSedes: true,
      loading: false,
    });
  });

  it('actualiza la sede activa en memoria cuando el login cambia de Moquegua a Arequipa', () => {
    localStorage.setItem('active_sede_id', moqueguaId);

    render(
      <SedeProvider>
        <SedeConsumer />
      </SedeProvider>
    );

    expect(screen.getByTestId('active-sede')).toHaveTextContent('Moquegua');

    act(() => setStoredActiveSedeId(arequipaId));

    expect(screen.getByTestId('active-sede')).toHaveTextContent('Arequipa');
  });
});