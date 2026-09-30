'use client';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn, ui } from '../../lib/ui';
export default function AppDialog({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            ui('modal'),
            wide && 'max-w-3xl',
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 focus:outline-none',
          )}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Edit your Lilt composition. Escape closes this dialog.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
