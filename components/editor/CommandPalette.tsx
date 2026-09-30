'use client';
import { Command } from 'cmdk';
import AppDialog from '../ui/AppDialog';
import { Kbd } from '../ui';
import Icon from '../Icon';
import { useEditor } from './EditorContext';
import { useEditorActions } from './useEditorActions';
export default function CommandPalette() {
  const e = useEditor(),
    actions = useEditorActions();
  return (
    <AppDialog
      open={e.commandOpen}
      title="Search editor actions"
      onClose={() => e.setCommandOpen(false)}
    >
      <Command label="Search editor actions" className="min-w-0">
        <div className="mb-3 flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-950 px-3">
          <Icon name="search" />
          <Command.Input
            aria-label="Search editor actions"
            placeholder="Search actions, tools, or shortcuts…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto">
          <Command.Empty className="p-5 text-center text-sm text-zinc-500">
            No matching action.
          </Command.Empty>
          {['Create', 'Edit', 'Timeline', 'Project'].map((group) => (
            <Command.Group
              key={group}
              heading={group}
              className="mb-3 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-zinc-500"
            >
              {actions
                .filter((a) => a.group === group)
                .map((action) => (
                  <Command.Item
                    key={action.id}
                    value={action.label}
                    keywords={[action.key]}
                    disabled={action.disabled}
                    onSelect={() => {
                      e.setCommandOpen(false);
                      action.run();
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-300 data-[selected=true]:bg-violet-400/15 data-[selected=true]:text-violet-100 data-[disabled=true]:opacity-30"
                  >
                    <Icon name={action.icon} />
                    <span className="flex-1">{action.label}</span>
                    {action.key && <Kbd>{action.key}</Kbd>}
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>
        <p className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          ↑ ↓ to navigate · Enter to run · Esc to close
        </p>
      </Command>
    </AppDialog>
  );
}
