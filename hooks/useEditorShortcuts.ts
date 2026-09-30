'use client';
import { useHotkeys } from 'react-hotkeys-hook';
export type ShortcutActions = {
  play: () => void;
  step: (n: number) => void;
  seekSecond: (n: number) => void;
  start: () => void;
  end: () => void;
  delete: () => void;
  newText: () => void;
  newShape: () => void;
  newProject: () => void;
  duplicate: () => void;
  trimStart: () => void;
  trimEnd: () => void;
  split: () => void;
  markIn: () => void;
  markOut: () => void;
  loop: () => void;
  marker: () => void;
  prevMarker: () => void;
  nextMarker: () => void;
  prevClip: () => void;
  nextClip: () => void;
  scroll: (n: number) => void;
  zoom: (n: number) => void;
  fit: () => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  import: () => void;
  help: () => void;
  escape: () => void;
  commands: () => void;
};
export const shortcutHelp = [
  ['Space', 'Play / pause'],
  ['← / →', 'Step one frame'],
  ['Shift + ← / →', 'Seek one second'],
  ['Home / End', 'Timeline start / end'],
  ['Delete / Backspace', 'Delete selected marker, character or clip'],
  ['N / Shift + N', 'New text / shape clip'],
  ['⌘ / Ctrl + Alt + N', 'New composition'],
  ['⌘ / Ctrl + D', 'Duplicate clip'],
  ['Q / W', 'Trim clip start / end to playhead'],
  ['S', 'Split clip at playhead'],
  ['I / O', 'Set loop start / end'],
  ['L', 'Toggle loop'],
  ['M', 'Add timeline marker'],
  ['Shift + M / Alt + M', 'Next / previous marker'],
  ['Alt + ← / →', 'Previous / next clip'],
  ['Shift + mouse wheel', 'Scroll timeline horizontally'],
  ['Page Up / Page Down', 'Scroll timeline left / right'],
  ['+ / −', 'Zoom timeline'],
  ['F', 'Fit timeline'],
  ['⌘ / Ctrl + Z', 'Undo'],
  ['⌘ / Ctrl + Shift + Z', 'Redo'],
  ['⌘ / Ctrl + S', 'Save locally'],
  ['⌘ / Ctrl + O', 'Import score'],
  ['⌘ / Ctrl + K', 'Search actions'],
  ['?', 'Keyboard shortcuts'],
  ['Escape', 'Dismiss menu / clear selection'],
];
export function useEditorShortcuts(a: ShortcutActions, enabled: boolean) {
  const options = {
    enabled,
    preventDefault: true,
    ignoreEventWhen: (event: KeyboardEvent) =>
      event.defaultPrevented ||
      !!(event.target as Element | null)?.closest('[data-local-shortcuts]'),
    enableOnFormTags: false,
    enableOnContentEditable: false,
  };
  useHotkeys('space', a.play, options);
  useHotkeys('left', () => a.step(-1), options);
  useHotkeys('right', () => a.step(1), options);
  useHotkeys('shift+left', () => a.seekSecond(-1), options);
  useHotkeys('shift+right', () => a.seekSecond(1), options);
  useHotkeys('home', a.start, options);
  useHotkeys('end', a.end, options);
  useHotkeys('delete,backspace', a.delete, options);
  useHotkeys('n', a.newText, options);
  useHotkeys('shift+n', a.newShape, options);
  useHotkeys('mod+alt+n', a.newProject, options);
  useHotkeys('mod+d', a.duplicate, options);
  useHotkeys('q', a.trimStart, options);
  useHotkeys('w', a.trimEnd, options);
  useHotkeys('s', a.split, options);
  useHotkeys('i', a.markIn, options);
  useHotkeys('o', a.markOut, options);
  useHotkeys('l', a.loop, options);
  useHotkeys('m', a.marker, options);
  useHotkeys('shift+m', a.nextMarker, options);
  useHotkeys('alt+m', a.prevMarker, options);
  useHotkeys('alt+left', a.prevClip, options);
  useHotkeys('alt+right', a.nextClip, options);
  useHotkeys('pageup', () => a.scroll(-1), options);
  useHotkeys('pagedown', () => a.scroll(1), options);
  useHotkeys('equal,shift+equal', () => a.zoom(1), options);
  useHotkeys('minus', () => a.zoom(-1), options);
  useHotkeys('f', a.fit, options);
  useHotkeys('mod+z', a.undo, options);
  useHotkeys('mod+shift+z,mod+y', a.redo, options);
  useHotkeys('mod+o', a.import, options);
  useHotkeys('shift+slash', a.help, options);
  useHotkeys('escape', a.escape, { ...options, enabled: true });
  useHotkeys('mod+s', a.save, {
    ...options,
    enabled: true,
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });
  useHotkeys('mod+k', a.commands, {
    ...options,
    enabled: true,
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });
}
