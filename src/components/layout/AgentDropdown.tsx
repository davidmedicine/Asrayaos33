'use client';

/* --------------------------------------------------------------------------
   AgentDropdown v2 – header‑ready, token‑aware, GSAP‑animated
   -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback, useId } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import gsap from 'gsap';            // Flip will auto‑register if premium flag set
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/lib/state/store';
import type { AsrayaAgentId, AgentDefinition } from '@/types/agents';

import { CheckIcon }   from '@/components/icons/CheckIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';

/* ---------- small helper ------------------------------------------------- */

const AgentSymbol = React.memo<
  { symbolPath?: string; agentColor?: string; className?: string }
>(({ symbolPath, agentColor, className }) => {
  if (symbolPath && symbolPath !== 'none') {
    return (
      <img
        src={symbolPath}
        alt=""
        className={cn('w-full h-full object-contain', className)}
        draggable={false}
      />
    );
  }
  /* SVG fallback – keeps circular glyph + theme color */
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('w-full h-full', className)}
    >
      <circle cx="12" cy="12" r="10" fill={agentColor ?? 'currentColor'} />
    </svg>
  );
});
AgentSymbol.displayName = 'AgentSymbol';

/* ---------- props -------------------------------------------------------- */

interface AgentDropdownProps {
  /** slot to override trigger; receives active agent */
  renderTrigger?: (ctx: { agent: AgentDefinition }) => React.ReactNode;
  /** run after agent switches (analytics, etc.) */
  onAgentChange?: (id: AsrayaAgentId) => void;
}

/* ---------- component ---------------------------------------------------- */

export const AgentDropdown: React.FC<AgentDropdownProps> = ({
  renderTrigger,
  onAgentChange,
}) => {
  /* ----- store ---------------------------------------------------------- */
  const { activeAgentId, setActiveAgentId, agentRegistry } = useAgentStore(
    (s) => ({
      activeAgentId: s.activeAgentId,
      setActiveAgentId: s.setActiveAgentId,
      agentRegistry: s.agentRegistry,
    })
  );

  /* ----- mount guard ---------------------------------------------------- */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ----- open state ----------------------------------------------------- */
  const [open, setOpen] = useState(false);

  /* ----- derived -------------------------------------------------------- */
  const activeAgent =
    mounted && agentRegistry ? agentRegistry[activeAgentId] : undefined;

  /* ----- handlers ------------------------------------------------------- */
  const pickAgent = useCallback(
    (id: string) => {
      if (!agentRegistry?.[id]) return;
      setActiveAgentId(id as AsrayaAgentId);
      onAgentChange?.(id as AsrayaAgentId);
    },
    [setActiveAgentId, onAgentChange, agentRegistry]
  );

  /* ----- noop while loading -------------------------------------------- */
  if (!mounted || !activeAgent)
    return (
      <div
        className="flex items-center gap-2 h-9 px-2"
        aria-label="Loading agent selection"
      >
        <div className="w-5 h-5 rounded-full bg-[var(--bg-muted)] animate-pulse" />
        <div className="w-16 h-4 rounded bg-[var(--bg-muted)] animate-pulse hidden md:block" />
      </div>
    );

  /* ---------- trigger --------------------------------------------------- */

  const Trigger = renderTrigger ? (
    renderTrigger({ agent: activeAgent })
  ) : (
    <button
      className={cn(
        'flex items-center gap-2 h-9 px-2 rounded-md',
        'transition-shadow duration-150 ease-out',
        'hover:shadow-[var(--glow-primary-xs)] focus-visible:shadow-[var(--glow-primary-sm)]',
        activeAgent.themeClass
      )}
      aria-label={`Current agent: ${activeAgent.name}. Click to change`}
    >
      <span
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 overflow-hidden',
          'bg-[var(--agent-avatar-gradient,var(--bg-muted))]',
          activeAgent.avatarStyle === 'orb' && 'animate-aura-pulse'
        )}
      >
        <AgentSymbol
          symbolPath={activeAgent.symbol}
          agentColor={activeAgent.colorPrimary}
          className="w-3 h-3 opacity-90"
        />
      </span>

      <span className="hidden md:inline text-sm font-medium truncate">
        {activeAgent.name}
      </span>

      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          'hidden md:inline w-3 h-3 transition-transform',
          open && 'rotate-180'
        )}
      />
    </button>
  );

  /* ---------- render ---------------------------------------------------- */

  /* unique id ensures GSAP Flip scope */
  const id = useId();

  /* animate with Flip if premium flag is on & user allows motion */
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GSAP_UI || !window || open === undefined) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('gsap/Flip').then(({ Flip }) => {
      const state = Flip.getState(`#${id} [data-chevron]`);
      Flip.from(state, {
        absolute: true,
        duration: 0.35,
        ease: 'power1.out',
        nested: true,
      });
    });
  }, [open, id]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>{Trigger}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          id={id}
          side="bottom"
          align="end"
          sideOffset={6}
          className={cn(
            'z-dropdown w-56 origin-top-right',
            'rounded-md border border-[var(--border-muted)] bg-[var(--bg-surface)]',
            'shadow-[var(--panel-shadow)] texture-noise-subtle',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:scale-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:scale-out-95',
            'focus:outline-none'
          )}
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs text-[var(--text-muted)]">
            Select agent
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="h-px my-1 bg-[var(--border-muted)]" />

          <DropdownMenu.RadioGroup
            value={activeAgentId}
            onValueChange={pickAgent}
          >
            {Object.values(agentRegistry).map((agent) => (
              <DropdownMenu.RadioItem
                key={agent.id}
                value={agent.id}
                className={cn(
                  'relative flex w-full items-center gap-2 px-3 py-2 rounded-sm',
                  'cursor-default text-sm leading-tight',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]',
                  'data-[highlighted]:bg-[var(--bg-hover)]'
                )}
              >
                <span
                  className="w-4 h-4 flex items-center justify-center rounded-full shrink-0 border border-[color-mix(in_oklch,currentColor_15%,transparent)]"
                  style={{ backgroundColor: agent.colorPrimary }}
                >
                  <AgentSymbol
                    symbolPath={agent.symbol}
                    agentColor={agent.colorPrimary}
                    className="w-2.5 h-2.5"
                  />
                </span>
                <span className="truncate font-medium">{agent.name}</span>
                <span className="ml-auto text-xs text-[var(--text-subtle)]">
                  {agent.tone}
                </span>

                <DropdownMenu.ItemIndicator className="absolute right-2">
                  <CheckIcon className="w-4 h-4 text-[var(--agent-color-primary)]" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
