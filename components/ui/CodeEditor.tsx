'use client';
import { lazy, Suspense } from 'react';
const Core = lazy(() => import('./CodeEditorCore'));
export default function CodeEditor(props: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  language?: 'json' | 'javascript';
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-80 items-center justify-center text-sm text-zinc-500">
          Loading code editor…
        </div>
      }
    >
      <Core {...props} />
    </Suspense>
  );
}
