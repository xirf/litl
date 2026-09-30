'use client';
import { DropdownMenu } from 'radix-ui';
import { ui } from '../lib/ui';
export default function ContextMenu({
  x,
  y,
  onClose,
  items,
}: {
  x: number;
  y: number;
  onClose: () => void;
  items: { label: string; action: () => void; disabled?: boolean }[];
}) {
  return (
    <DropdownMenu.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Timeline actions"
          className="pointer-events-none fixed size-px opacity-0"
          style={{ left: x, top: y }}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label="Timeline actions"
          align="start"
          sideOffset={0}
          collisionPadding={8}
          className={ui('context-menu')}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              disabled={item.disabled}
              onSelect={() => {
                onClose();
                item.action();
              }}
              className="flex cursor-pointer items-center rounded px-3 py-2 text-xs text-zinc-200 outline-none data-disabled:opacity-40 data-highlighted:bg-violet-400/15 data-highlighted:text-violet-200"
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
