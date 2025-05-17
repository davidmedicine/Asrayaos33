import { Command as CommandPrimitive } from 'cmdk';
import { Command } from '@/types/command';
// import { Icon } from '@/components/ui/Icon'; // Assuming Icon component exists

interface CommandItemProps {
  command: Command;
  onSelect: () => void;
}

export function CommandItem({ command, onSelect }: CommandItemProps) {
  return (
    <CommandPrimitive.Item
      value={command.id}
      onSelect={onSelect}
      className="px-2 py-1.5 mx-1 text-sm rounded-md flex items-center justify-between cursor-default select-none outline-none text-[var(--text-default)] data-[selected]:bg-[var(--bg-agent-muted)] data-[selected]:text-[var(--text-agent-accent)]"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {command.icon && (
          // Icon placeholder
          <span className="flex-shrink-0 w-4 h-4 text-[var(--text-muted)]">•</span>
        )}
        <span className="truncate">{command.label}</span>
      </div>

      {command.keyboardShortcut && (
        <span className="ml-auto flex gap-1 pl-2 flex-shrink-0">
          {Array.isArray(command.keyboardShortcut) ? (
            command.keyboardShortcut.map((key, i) => (
              <kbd key={i} className="flex h-5 min-w-5 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-muted)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                {key}
              </kbd>
            ))
          ) : (
            // Handle the case where it might be a string for backward compatibility
            <kbd className="flex h-5 min-w-5 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-muted)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
              {command.keyboardShortcut}
            </kbd>
          )}
        </span>
      )}
    </CommandPrimitive.Item>
  );
}