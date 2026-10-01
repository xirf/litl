'use client';
import { DropdownMenu } from 'radix-ui';
import { useEditor } from './EditorContext';
import { Button } from '../ui';
export default function EditorMenus() {
  const e = useEditor();
  const menus = [
    {
      name: 'File',
      items: [
        ['New composition', e.newProject],
        ['Open JSON…', () => e.importInput.current?.click()],
        ['Save', e.saveProject],
        ['Save as JSON…', e.exportScore],
        ['Export standalone HTML', e.exportHTML],
      ],
    },
    {
      name: 'Edit',
      items: [
        ['Undo', () => e.undo()],
        ['Redo', () => e.undo(true)],
        ['Duplicate clip', e.duplicateClip],
        ['Delete selection', e.deleteSelection],
        ['Split at playhead', e.splitClip],
        ['Edit project code', () => e.openJSON()],
      ],
    },
    {
      name: 'View',
      items: [
        ['Fit timeline', e.fitTimeline],
        ['Search actions', () => e.setCommandOpen(true)],
        ['Keyboard shortcuts', () => e.setModal('help')],
      ],
    },
  ];
  return (
    <nav aria-label="Editor menus" className="flex gap-1">
      {menus.map((menu) => (
        <DropdownMenu.Root key={menu.name}>
          <DropdownMenu.Trigger asChild>
            <Button>{menu.name}</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-48 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
              sideOffset={4}
            >
              {menu.items.map(([label, action]) => (
                <DropdownMenu.Item
                  key={label as string}
                  onSelect={action as () => void}
                  className="cursor-pointer rounded px-3 py-2 text-xs text-zinc-200 outline-none data-highlighted:bg-violet-400/20"
                >
                  {label as string}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ))}
    </nav>
  );
}
