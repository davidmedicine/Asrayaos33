MPLEMENTATION BRIEF: Asraya OS Onboarding UI (Finalized v3)
(As of: Friday, April 4, 2025 at 11:16 PM -05 (Peru))

✅ Objective:
Implement the complete onboarding experience for Asraya OS using the OnboardingStepHost pattern. This involves integrating with PanelGroup via panelsOverride, applying GSAP Premium animations for key transitions and moments, ensuring proper theming via dynamic CSS variables, and adhering strictly to the detailed specifications provided.

📘 Context & Architecture:
The onboarding shell lives in (onboarding)/layout.tsx, providing ambient gradients and dynamic orb animation (assumed complete and refined).
useOnboardingFlow.ts handles all onboarding logic and state (step progression, inputs, transitions, progress, onComplete callback - assumed complete and refined).
PanelGroup.tsx acts as the container; we will use its panelsOverride prop to inject a single OnboardingStepHost panel dynamically.
This approach avoids adding onboarding-specific layouts to layoutRegistry.ts, decoupling the flow.
Onboarding visuals use the theme-step-[stepId] class (applied by OnboardingStepHost) and dynamic CSS variables defined in global.css.
GSAP Premium is available and should be leveraged. Use @gsap/react’s useGSAP() hook.
Primary Reference: [src/app/docs/onboarding.md] for step-specific UI, content, and interaction details.
🔧 STEP-BY-STEP INSTRUCTIONS:
📁 1. Create Step Component Skeletons
Directory: features/onboarding/components/steps/
Create Files: Create skeleton files with proper props definitions (React.FC<StepProps>) for:
WelcomeStep.tsx
NameOSStep.tsx
SetIntentionStep.tsx
ReflectionStep.tsx
NameArtifactStep.tsx
CompletionStep.tsx (Recommended)
Each component must:
Render UI based on passed props (e.g., inputs, setInput, onNext, onBack, stepMeta) and the onboarding.md brief (titles, prompts, specific elements like tags or agent display).
Use imported UI primitives: <Input />, <Textarea />, <Button />, <TagInput /> (from components/ui/).
Be fully responsive (mobile-first) and accessible. Center content appropriately within the step area. Apply mobile-friendly spacing and consider bottom-aligned actions where relevant.
Theming: Step components should inherit all theming from the wrapping theme-step-${currentStep} class on OnboardingStepHost. Avoid applying step-specific theme classes inside individual step components. Instead, use standard theme CSS variables (text-text-default, bg-bg-surface, --agent-color-primary, etc.), which resolve dynamically based on the host's theme class.
Avoid using the main app's InputBar.tsx.
Place step-specific GSAP animations (e.g., text reveals using SplitText) within the relevant step component using useGSAP().
Do not use AnimatePresence inside these components; transitions are handled by OnboardingStepHost.
🌌 2. Implement WorldTeleportOverlay.tsx
File: features/onboarding/components/WorldTeleportOverlay.tsx
Props:
TypeScript

interface WorldTeleportOverlayProps {
  isActive: boolean;
  onComplete: () => void;
}
Responsibilities:
Implement a full-screen overlay (position: fixed, inset: 0, high z-index).
Use useGSAP() from @gsap/react (with a scope ref) to create and manage the animation timeline.
Animate the "mystical transition" based on onboarding.md when isActive becomes true (e.g., orb expansion, glow pulses using --agent-color-primary, particle effects, blur fade).
Leverage GSAP Premium plugins (e.g., CustomEase, MorphSVG for orb/glyphs, MotionPath for particles) as needed for high fidelity.
Ensure the GSAP timeline reliably calls the onComplete() prop function upon animation completion.
Manage the timeline effectively to run only once per activation (e.g., check isActive within useGSAP dependencies).
Styling: Use Tailwind utilities. Consider backdrop-blur, color-mix() for glows, and opacity fades.
🪄 3. Create OnboardingStepHost.tsx
File: features/onboarding/components/OnboardingStepHost.tsx
Mark 'use client'; at the top.
Props: Define an interface for props injected via panelProps from steps.tsx:
TypeScript

interface OnboardingStepHostProps {
  currentStep: OnboardingStepId;
  stepMeta?: { title?: string; description?: string }; // Match actual StepMeta type if defined
  inputs: OnboardingInputs;
  setInput: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  // Add currentProgress, error, etc. if needed by steps directly
}
Structure & Theming:
Apply the dynamic theme class and base layout to the root element:
TypeScript

<div className={`theme-step-${props.currentStep} h-full w-full flex flex-col items-center justify-center p-4 md:p-8`}>
  {/* AnimatePresence and Step Rendering */}
</div>
Step Rendering & Animation:
Inside the root div, use <AnimatePresence mode="wait">.
Conditionally render the correct step component based on props.currentStep.
Wrap each step component instance in a <motion.div>:
TypeScript

<AnimatePresence mode="wait">
  <motion.div
    key={props.currentStep} // Crucial for AnimatePresence
    initial={{ opacity: 0, y: 20 }} // Example: slight vertical motion
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} // Example ease
    className="w-full h-full flex items-center justify-center" // Ensure motion div fills space
  >
    {/* {props.currentStep === 'welcome' && <WelcomeStep {...props} />} */}
    {/* Render correct step component, passing down needed props from props */}
  </motion.div>
</AnimatePresence>
Pass all necessary props down to the active step component.
Important: This component receives props and orchestrates step display/transitions. It does not call useOnboardingFlow() itself.
🧠 4. Implement steps.tsx (Page Logic)
File: app/(onboarding)/steps.tsx
Mark 'use client';. Import hooks (useRouter, useOnboardingFlow, useMemo), components (PanelGroup, WorldTeleportOverlay), types.
Hook Setup:
TypeScript

const router = useRouter();
const {
  currentStep, stepMeta, inputs, setInput,
  handleNextStep, handlePrevStep,
  isTeleporting, currentProgress, endTeleport
  // Ensure all props needed by OnboardingStepHostProps are destructured
} = useOnboardingFlow({ onComplete: () => router.push('/dashboard') }); // Define default completion behavior
Prepare Panel Data: Use useMemo for panelProps (containing everything OnboardingStepHost needs) and panelsOverride. Ensure dependency arrays are correct.
TypeScript

const panelProps = useMemo(() => ({
  currentStep, stepMeta, inputs, setInput, handleNextStep, handlePrevStep
  // Pass all props defined in OnboardingStepHostProps interface
}), [currentStep, stepMeta, inputs, setInput, handleNextStep, handlePrevStep]);

const panelsOverride = useMemo(() => [{
  id: 'onboarding-main', // Static ID for the single panel
  component: 'OnboardingStepHost', // Registered key
  props: panelProps
}], [panelProps]);
Render Layout:
TypeScript

<>
  {/* Progress Bar */}
  <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-bg-muted overflow-hidden">
    <div
      className="h-full bg-[var(--agent-color-primary,theme(colors.indigo.500))] transition-all duration-300 ease-out"
      style={{ width: `${currentProgress}%` }}
    />
  </div>

  {/* PanelGroup Container (takes remaining space) */}
  <div className="flex-1 w-full pt-1"> {/* Offset for progress bar */}
    <PanelGroup
      panelsOverride={panelsOverride}
      direction="horizontal" // Only one panel, direction matters less but horizontal is fine
      allowResize={false} // Important!
      initialFocusPanelId="onboarding-main" // Focus the host panel
      className="h-full w-full" // Ensure it fills container
    />
  </div>

  {/* Teleport Animation Overlay (renders outside PanelGroup) */}
  {/* Note: Renders outside PanelGroup structure for fullscreen overlay */}
  <WorldTeleportOverlay isActive={isTeleporting} onComplete={endTeleport} />
</>
🧷 5. Register OnboardingStepHost in panelRegistry.ts
Add the following import and registration call in lib/core/panelRegistry.ts:
TypeScript

// lib/core/panelRegistry.ts
import { OnboardingStepHost } from '@/features/onboarding/components/OnboardingStepHost';

// Assuming panelRegistry has a 'register' method or similar:
panelRegistry.register('OnboardingStepHost', OnboardingStepHost);
// Or if it's a plain object:
// panelComponentRegistry['OnboardingStepHost'] = OnboardingStepHost;
🎞️ 6. GSAP Premium Usage (Best Practices)
✅ WorldTeleportOverlay (Primary GSAP Use Case):
Use useGSAP() with a ref scope for cleanup.
Build a timeline for the sequence: Orb scale-up (scale, opacity), radial glow pulses (box-shadow or filter), backdrop blur (filter: blur() toggle/tween), particle trails/bursts (MorphSVG/MotionPath or DOM elements).
Use CustomEase for unique, non-linear motion (essential for "mystical").
Use GSDevTools locally for debugging the timeline.
Crucially: Call the onComplete prop at the end of the timeline.
✅ Step Components (Optional Enhancements):
Use SplitText within useGSAP (scoped to the step component) in:
WelcomeStep: Animate greeting word-by-word.
ReflectionStep: Animate any AI summary/response reveal.
CompletionStep: Animate the final message or artifact name reveal.
Consider subtle onMount animations for step content using gsap.from() within useGSAP.
Use GSAP for specific effects mentioned in the brief like the artifact card glow/reveal or agent orb pulse in CompletionStep.
✅ Output Checklist:
app/(onboarding)/steps.tsx implemented.
features/onboarding/components/OnboardingStepHost.tsx implemented.
features/onboarding/components/WorldTeleportOverlay.tsx implemented with GSAP.
Skeleton files created for all step components in features/onboarding/components/steps/.
Code snippet/instruction provided for registering OnboardingStepHost.
