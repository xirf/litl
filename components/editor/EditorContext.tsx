'use client';

import { createContext, useContext } from 'react';
import type { EditorController } from '../../hooks/useStudioController';
export const EditorContext = createContext<EditorController | null>(null);
export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw Error('Editor provider missing');
  return context;
}
