Okay, continuing with the final batch of pseudocode generation for the Asraya OS v10.6 UI layer, covering Command Menu, Artifact Creation, Onboarding, Shared UI Primitives, Settings, and Notifications.

(Current Time: Thursday, April 3, 2025 at 4:28:08 PM -05, Peru)

5. Command Menu

TypeScript

// === File: components/command-menu/CommandMenu.tsx ===
// [Paste full code from v10.6 pseudocode - Includes recommendations/filtering logic using useInteractionContext]
// Description: Global command palette using cmdk. Filters commands based on context, search, and recommendations.
TypeScript

// === File: components/command-menu/CommandItem.tsx ===
// [Paste full code from v10.3 pseudocode - Renders individual command]
// Description: Renders a single item within the CommandMenu list.
TypeScript

// === File: components/command-menu/CommandMenuTrigger.tsx ===
// [Paste full code from v10.3 pseudocode - Button to open menu]
// Description: Button or element used to open the Command Menu. Listens for global keyboard shortcut.
TypeScript

// === File: features/chat/command-menu/registerCommands.ts ===
// [Paste full code from v10.3 pseudocode - Example feature-specific command registration]
// Description: Example of how a feature module registers its commands using lib/core/commandRegistry.ts.
6. Artifact Creation UI

TypeScript

// === File: components/artifacts/ArtifactCaptureModal.tsx ===
// [Paste full code from v10.6 pseudocode - Includes typed relations state and UI section]
// Description: Modal dialog for naming, tagging, linking (with types), and confirming artifact creation. Uses RelatedArtifactsLinker.
TypeScript

// === File: components/artifacts/RelatedArtifactsLinker.tsx ===
// [Paste full code from v10.6 pseudocode - Includes relation type selection concept]
// Description: Component within the modal to search/select other artifacts and specify relation type. Uses useMemoryStore for search.
TypeScript

// === File: hooks/useCreateArtifact.ts ===
// [Paste full code from v10.6 pseudocode - Includes split functions, toast integration, calls Server Action]
// Description: Hook managing artifact creation flow (modal trigger, direct submission). Calls Server Action (using Drizzle) for persistence. Integrates with notifications/Orb pulse.
// Drizzle Note: The underlying Server Action (`createArtifactServerAction`) uses Drizzle queries from `lib/db/queries.ts` to insert the artifact data, including metadata like relations, into the database.
7. Mobile Adaptations

(Covered within relevant components: PanelGroup, FAB, PinDockMobile, responsive styles via Tailwind/useMediaQuery, simplified Orb.)

8. Onboarding UI (Initiation Ritual)

TypeScript

// === File: app/(onboarding)/steps.tsx ===
// [Paste full code from v10.6 pseudocode - Renders steps based on useOnboardingFlow state]
// Description: Renders the correct onboarding step using AnimatePresence for transitions.
TypeScript

// === File: app/(onboarding)/layout.tsx ===
// [Paste full code from v10.3 pseudocode]
// Description: Minimal layout for the onboarding flow.
TypeScript

// === File: features/onboarding/components/steps/WelcomeStep.tsx ===
// [Paste full code from v10.3 pseudocode]
// Description: First step of the onboarding flow. Uses Framer Motion for entrance.
TypeScript

// === File: features/onboarding/components/steps/NameOSStep.tsx ===
// Description: Step for naming the OS instance. (Example of another step)

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface NameOSStepProps {
  onSubmit: (name: string) => void;
}

export function NameOSStep({ onSubmit }: NameOSStepProps) {
    const [name, setName] = useState('');
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold text-text-heading">Give Your OS a Name</h2>
            <p className="text-text-muted max-w-md text-center">This name represents your personal instance of Asraya.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }} className="w-full max-w-xs space-y-4">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Inner Sanctum, Mind Garden"
                    autoFocus
                />
                <Button type="submit" disabled={!name.trim()} className="w-full">Continue</Button>
            </form>
        </div>
    );
}
TypeScript

// === File: features/onboarding/components/steps/SetIntentionStep.tsx ===
// Description: Step for setting user intention. (Example using InputBar concept)

import { useState } from 'react';
import { Textarea } from '@/components/ui/Textarea'; // Or reuse InputBar? Textarea might be better for longer intention.
import { Button } from '@/components/ui/Button';

interface SetIntentionStepProps {
  onSubmit: (intention: string) => void;
}

export function SetIntentionStep({ onSubmit }: SetIntentionStepProps) {
    const [intention, setIntention] = useState('');
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold text-text-heading">Set Your Intention</h2>
            <p className="text-text-muted max-w-md text-center">What do you seek to cultivate or explore by using Asraya OS?</p>
            <form onSubmit={(e) => { e.preventDefault(); if (intention.trim()) onSubmit(intention.trim()); }} className="w-full max-w-md space-y-4">
                 {/* Using Textarea for potentially longer input */}
                <Textarea
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="e.g., 'To understand my thought patterns', 'To nurture my creativity', 'To find inner peace'..."
                    rows={4}
                    autoFocus
                />
                <Button type="submit" disabled={!intention.trim()} className="w-full">Share with Oracle</Button>
            </form>
        </div>
    );
}
TypeScript

// === File: features/onboarding/components/steps/ReflectionStep.tsx ===
// [Paste full code from v10.3 pseudocode - Includes InputBar integration, LangGraph interaction]
// Description: Step where user interacts with the Oracle agent.
TypeScript

// === File: features/onboarding/components/steps/NameArtifactStep.tsx ===
// Description: Step for naming the first Insight artifact.

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/lib/state/slices/onboardingSlice'; // Get reflection summary for context

interface NameArtifactStepProps {
  onSubmit: (name: string) => void;
}

export function NameArtifactStep({ onSubmit }: NameArtifactStepProps) {
    const [name, setName] = useState('');
    // Optional: Display the reflection summary that led to this artifact
    // const reflectionSummary = useOnboardingStore(state => state.reflectionSummary);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-semibold text-text-heading">Name Your First Insight</h2>
            <p className="text-text-muted max-w-md text-center">The Oracle has helped synthesize your reflection. Give this core insight a meaningful name.</p>
             {/* Optional: Display reflection summary preview card */}
             {/* <Card className="p-3 text-sm text-text-muted max-w-md">{reflectionSummary}</Card> */}
             <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }} className="w-full max-w-xs space-y-4">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., 'My Core Intention', 'Path to Clarity'"
                    autoFocus
                />
                <Button type="submit" disabled={!name.trim()} className="w-full">Solidify Insight</Button>
            </form>
        </div>
    );
}
TypeScript

// === File: features/onboarding/components/WorldTeleportOverlay.tsx ===
// [Paste full code from v10.6 pseudocode - Explicitly uses useGSAP]
// Description: Uses GSAP Premium for the animated transition between Reflection/Naming and World steps.
TypeScript

// === File: hooks/useOnboardingFlow.ts ===
// [Paste full code from v10.3 pseudocode - Manages state, transitions, calls useCreateArtifact]
// Description: Orchestrates the multi-step onboarding process. Calls Server Action via useCreateArtifact to save first artifact (using Drizzle). Updates artifact name via another Server Action. Persists final onboarding state via Server Action.
// Drizzle Note: Server Actions called by this hook (via useCreateArtifact or directly for finalizing state) use Drizzle queries.
9. Shared UI Primitives

(Provide key examples, others follow similar patterns using Tailwind vars & potentially Radix)

TypeScript

// === File: components/ui/Button.tsx ===
// [Paste full code from v10.3 pseudocode - Includes variants, sizes, isLoading, uses cva]
TypeScript

// === File: components/ui/Input.tsx ===
// [Paste full code from v10.3 pseudocode - Includes label, error display]
TypeScript

// === File: components/ui/Modal.tsx ===
// [Paste full code from v10.3 pseudocode - Uses Radix/Framer Motion]
TypeScript

// === File: components/ui/Card.tsx ===
// [Paste full code from v10.3 pseudocode - Basic card wrapper]
TypeScript

// === File: components/ui/Tooltip.tsx ===
// [Paste full code from v10.3 pseudocode - Uses Radix]
TypeScript

// === File: components/ui/Select.tsx ===
// [Paste full code from v10.6 pseudocode - Radix implementation]
TypeScript

// === File: components/ui/Switch.tsx ===
// [Paste full code from v10.6 pseudocode - Radix implementation]
TypeScript

// === File: components/ui/Checkbox.tsx ===
// Description: Reusable checkbox component (Conceptual - use Radix Checkbox).

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
// Icons

export function Checkbox({ id, checked, onCheckedChange, label, ...props }: any /* CheckboxProps */) {
    const checkboxId = id ?? React.useId();
    return (
        <div className="flex items-center space-x-2">
            <CheckboxPrimitive.Root
                id={checkboxId}
                checked={checked}
                onCheckedChange={onCheckedChange}
                className="peer h-4 w-4 shrink-0 rounded-sm border border-[var(--border-default)] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 data-[state=checked]:bg-[var(--agent-color-primary)] data-[state=checked]:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                {...props}
            >
                <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
                    {/* <Icon name="Check" size={12} /> */}
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            {label && <label htmlFor={checkboxId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
        </div>
    );
}
TypeScript

// === File: components/ui/Badge.tsx ===
// Description: Reusable badge component.

import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--agent-color-primary)] text-primary-foreground hover:opacity-80',
        secondary: 'border-transparent bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[color-mix(in_oklch,var(--bg-muted)_90%,_black)]',
        destructive: 'border-transparent bg-[var(--color-error)] text-destructive-foreground hover:opacity-80',
        outline: 'text-foreground border-[var(--border-default)]',
      },
    },
    defaultVariants: { variant: 'default', },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeVariants({ variant, className })} {...props} />;
}

export { Badge, badgeVariants };
(Pseudocode for TagInput, SearchInput, ColorPicker, Logo would be specific implementations or use libraries, styled similarly.)

10. Settings System

TypeScript

// === File: app/(main)/settings/[[...slug]]/page.tsx ===
// [Paste full code from v10.5 pseudocode - Handles routing to settings sections]
// Description: Entry point for the settings area. Uses SettingsLayout.
TypeScript

// === File: components/layout/SettingsLayout.tsx ===
// [Paste full code from v10.5 pseudocode - Includes navigation for all sections]
// Description: Provides the sidebar navigation and wrapper for the settings pages. Uses NavLink style active state.
TypeScript

// === File: features/settings/components/GeneralSettings.tsx ===
// [Paste full code from v10.6 pseudocode - Placeholder]
// Description: Component for general application settings. Uses useSettingsStore.
TypeScript

// === File: features/settings/components/AppearanceSettings.tsx ===
// [Paste full code from v10.5 pseudocode - Includes theme, accent, font controls + CSS var application logic]
// Description: Component for managing visual settings. Uses useSettingsStore. Calls Server Action via slice.
// Drizzle Note: The underlying updateSetting action uses a Server Action which uses Drizzle queries to persist settings.
TypeScript

// === File: features/settings/components/AgentSettings.tsx ===
// [Paste full code from v10.6 pseudocode - Includes list view, capability toggles, placeholders for Sandbox/Swatches]
// Description: Component for viewing and configuring agents. Uses useCoreStore and useSettingsStore.
// Drizzle Note: Updating agent config uses a Server Action -> Drizzle query.
TypeScript

// === File: features/settings/components/InteractionSettings.tsx ===
// [Paste full code from v10.5 pseudocode - Includes voice settings]
// Description: Settings related to user interaction. Uses useSettingsStore.
TypeScript

// === File: features/settings/components/ExperimentalSettings.tsx ===
// [Paste full code from v10.5 pseudocode - Uses devToolsSlice/flags]
// Description: Section for toggling experimental features. Uses useDevToolsStore or useSettingsStore.
TypeScript

// === File: features/settings/components/AgentResponseSandbox.tsx ===
// [Paste full code from v10.6 pseudocode - Placeholder]
// Description: Allows testing agent responses with current settings. Calls LangGraph.
11. Notification System

TypeScript

// === File: components/notifications/ToastContainer.tsx ===
// [Paste full code from v10.3 pseudocode - Uses Framer Motion, displays toasts from notificationSlice]
// Description: Displays ephemeral toast notifications.
TypeScript

// === File: features/notifications/components/NotificationPanel.tsx ===
// [Paste full code from v10.6 pseudocode - Includes filtering (all/unread/favorites)]
// Description: Panel/dropdown showing persistent notification history. Uses notificationSlice.
// Drizzle Note: Initial load and updates (read, archive, favorite) use Server Actions -> Drizzle queries via notificationSlice actions.
TypeScript

// === File: features/notifications/components/NotificationItem.tsx ===
// [Paste full code from v10.6 pseudocode - Includes actor badge, archive/favorite actions]
// Description: Renders a single notification item. Reacts to notification properties like variant, actor, isRead.