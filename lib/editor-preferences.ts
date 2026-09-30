'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
type Preferences = {
  zoom: number;
  swipeMode: string;
  commandOpen: boolean;
  setZoom: (value: number | ((n: number) => number)) => void;
  setSwipeMode: (value: string) => void;
  setCommandOpen: (value: boolean) => void;
};
export const useEditorPreferences = create<Preferences>()(
  persist(
    (set) => ({
      zoom: 1,
      swipeMode: 'pan',
      commandOpen: false,
      setZoom: (value) =>
        set((s) => ({ zoom: typeof value === 'function' ? value(s.zoom) : value })),
      setSwipeMode: (swipeMode) => set({ swipeMode }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
    }),
    {
      name: 'lilt-editor-preferences-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ zoom, swipeMode }) => ({ zoom, swipeMode }),
      skipHydration: true,
    },
  ),
);
