# AsrayaOS Design System: MVP Implementation Plan

## Focus Areas
This MVP targets maximum visual impact with minimal implementation effort, focusing on:
1. Color system modernization with OKLCH
2. Oracle Orb enhancement
3. Topbar refinement
4. Animation optimization

## High-Impact Deliverables (2-Week Timeline)

### Week 1: Foundation & Oracle Orb

#### Day 1-2: Core Token Architecture in `globals.css`
- **Action**: Create optimized OKLCH palette using Apple's recommended pattern
  ```css
  @layer theme.base {
    /* Core OKLCH primitives - primary definitions only */
    --oracle-violet-500: oklch(65% 0.276 275);
    --cosmic-blue-500: oklch(60% 0.18 255);
    
    /* Surface system */
    --surface-0: oklch(20% 0.02 275);
    --surface-1: oklch(25% 0.03 275);
    --surface-2: oklch(30% 0.04 275);
    --surface-3: oklch(35% 0.05 275);
    
    /* Key semantic tokens */
    --oracle-primary: var(--oracle-violet-500);
    --oracle-secondary: var(--cosmic-blue-500);
  }
  
  /* Build-time processor injects this block for sRGB fallbacks */
  @supports not (color: oklch(0 0 0)) {
    :root {
      --oracle-violet-500: #8250df;
      --cosmic-blue-500: #4a72df;
      --surface-0: #121212;
      --surface-1: #1e1e1e;
      --surface-2: #282828;
      --surface-3: #333333;
    }
  }
  ```
- **Action**: Add Firefox display-P3 detection script
  ```js
  // Add to main JS entry point
  const hasDisplayP3Support = () => {
    return 'CSS' in window && 
           'colorSpaces' in CSS && 
           'displayP3' in CSS.colorSpaces;
  };
  
  if (!hasDisplayP3Support()) {
    document.documentElement.classList.add('no-p3');
  }
  ```
  ```css
  /* Reduced chroma for non-P3 browsers */
  .no-p3 {
    --oracle-violet-500: oklch(65% 0.22 275); /* Reduced chroma */
    --cosmic-blue-500: oklch(60% 0.15 255);
  }
  ```
- **Action**: Register key custom properties for animation
  ```css
  @layer base {
    @property --oracle-glow-radius {
      syntax: '<length>';
      initial-value: 0px;
      inherits: false;
    }
    
    @property --oracle-pulse-scale {
      syntax: '<number>';
      initial-value: 1;
      inherits: false;
    }
  }
  ```
- **Impact**: Establishes modern color system with optimal browser compatibility

#### Day 3-4: Oracle Orb Enhancement in `oracleOrb.tsx`
- **Action**: Implement advanced gradient using Tailwind v4's interpolation
  ```jsx
  <div 
    className="oracle-orb" 
    style={{
      background: `conic-gradient(
        from 45deg in oklch longer hue,
        var(--oracle-primary),
        var(--oracle-secondary),
        var(--oracle-primary)
      )`
    }}
  />
  ```
- **Action**: Add GPU-accelerated glow with inset-shadow
  ```jsx
  <div className="
    relative rounded-full overflow-hidden
    shadow-[0_0_25px_var(--oracle-primary)]
    after:absolute after:inset-0 
    after:bg-[radial-gradient(var(--oracle-glow)_20%,transparent_70%)] 
    after:opacity-60
  ">
    {/* Orb content */}
  </div>
  ```
- **Action**: Implement WCAG 2.2 focus appearance
  ```jsx
  <button 
    className="
      focus-visible:outline-[3px] focus-visible:outline-offset-2
      focus-visible:outline-[var(--oracle-primary)]
      motion-safe:transition-transform motion-safe:duration-300
    "
  >
    {/* Orb content */}
  </button>
  ```
- **Impact**: Dramatically improves the visual centerpiece of the application

### Week 2: Animation & Topbar Refinement

#### Day 5-6: Animation Optimization in `gsapSetup.ts`
- **Action**: Create ethereal CustomEase and implement optimized pulse
  ```js
  gsap.registerEase("ethereal", CustomEase.create("ethereal", "0.25, 0.1, 0.25, 1"));
  
  const createOraclePulse = (target) => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    
    return gsap.to(target, {
      '--oracle-glow-radius': '25px',
      '--oracle-pulse-scale': 1.05,
      duration: 3,
      ease: 'ethereal',
      repeat: -1,
      yoyo: true,
      onStart: () => {
        // Performance marking
        performance.mark('animation-start');
      },
      onComplete: () => {
        performance.measure('animation-duration', 'animation-start');
      }
    });
  };
  ```
- **Action**: Add @starting-style integration with animation-composition
  ```js
  // Add helper to ensure GSAP works with @starting-style
  const initializeElementWithStartingStyle = (element) => {
    if (!element) return;
    
    // Force a reflow to ensure @starting-style applies
    void element.offsetWidth;
    
    // Add composition mode for GSAP compatibility
    element.style.animationComposition = 'add';
  };
  
  // Use in component initialization
  useEffect(() => {
    if (orbRef.current) {
      initializeElementWithStartingStyle(orbRef.current);
      createOraclePulse(orbRef.current);
    }
  }, [orbRef]);
  ```
- **Impact**: Delivers smooth, optimized animations with proper accessibility support

#### Day 7-8: Topbar Refinement in `Topbar.tsx`
- **Action**: Implement semantic color tokens with color-mix()
  ```jsx
  <header 
    className="
      bg-surface-2 
      text-[var(--txt-hi)]
      border-b border-[color-mix(in_oklch,var(--surface-3),transparent_20%)]
    "
  >
    {/* Topbar content */}
  </header>
  ```
- **Action**: Add macOS-specific vibrancy with backdrop-filter
  ```jsx
  // Add OS detection
  const isMacOS = () => navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // In component
  <header 
    className={`
      bg-surface-2
      ${isMacOS() && window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'backdrop-blur-lg bg-opacity-85' 
        : ''}
    `}
  >
    {/* Topbar content */}
  </header>
  ```
- **Action**: Update icons and interactive elements with proper focus states
  ```jsx
  <button 
    className="
      p-2 rounded-full
      hover:bg-[color-mix(in_oklch,var(--surface-2),var(--oracle-primary)_10%)]
      focus-visible:outline-[3px] focus-visible:outline-offset-2
      focus-visible:outline-[var(--oracle-primary)]
    "
    aria-label="Menu"
  >
    <IconRegistry icon="menu" className="w-5 h-5 text-[var(--txt-hi)]" />
  </button>
  ```
- **Impact**: Creates a polished, consistent header with modern styling

#### Day 9-10: Testing & Performance Optimization
- **Action**: Implement automated contrast testing
  ```js
  // Add to test suite
  function testContrast(foreground, background) {
    // Calculate WCAG contrast ratio
    const ratio = calculateContrastRatio(foreground, background);
    return {
      passes: ratio >= 4.5, // AA standard
      ratio
    };
  }
  
  // Test key combinations
  test('Oracle orb has sufficient contrast with background', () => {
    const result = testContrast(
      getCSSVariable('--oracle-primary'),
      getCSSVariable('--surface-0')
    );
    expect(result.passes).toBe(true);
  });
  ```
- **Action**: Add performance monitoring for animations
  ```js
  // In gsapSetup.ts
  const monitorAnimationPerformance = (animation) => {
    let frameTimes = [];
    let lastFrameTime = performance.now();
    
    const checkFrame = () => {
      const now = performance.now();
      frameTimes.push(now - lastFrameTime);
      
      // Keep last 60 frames
      if (frameTimes.length > 60) {
        frameTimes.shift();
      }
      
      lastFrameTime = now;
      
      if (animation.isActive()) {
        requestAnimationFrame(checkFrame);
      } else {
        // Log performance metrics
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        console.log(`Animation average frame time: ${avgFrameTime.toFixed(2)}ms`);
      }
    };
    
    requestAnimationFrame(checkFrame);
  };
  ```
- **Action**: Create developer documentation
  ```md
  # Oracle Theming Guide
  
  ## OKLCH Color System
  
  Our new color system uses OKLCH for expanded gamut and perceptual uniformity.
  
  ### Key Variables
  - `--oracle-primary`: Main identity color (vibrant violet)
  - `--oracle-secondary`: Secondary accent color (cosmic blue)
  - `--surface-0` through `--surface-3`: Surface elevation system
  
  ## Animation Guidelines
  - Use `createOraclePulse()` for consistent Oracle animations
  - Always check for reduced-motion preferences
  - Target <10ms per frame for all animations
  ```
- **Impact**: Ensures quality, performance, and maintainability

## Implementation Extras (If Time Permits)

### Color-blind Safe Mode Toggle
- **Action**: Add Daltonization toggle in settings
  ```jsx
  <div className="flex items-center gap-2">
    <label htmlFor="colorblind-mode">Color-blind safe mode</label>
    <input 
      type="checkbox" 
      id="colorblind-mode" 
      onChange={(e) => {
        document.documentElement.classList.toggle('colorblind-safe', e.target.checked);
      }} 
    />
  </div>
  ```
  ```css
  .colorblind-safe {
    --oracle-primary: oklch(65% 0.22 245); /* Shifted hue for deuteranopia */
    --oracle-secondary: oklch(60% 0.15 215);
  }
  ```

### Live Theme Toggler
- **Action**: Add system/dark/light mode toggle
  ```jsx
  <select 
    onChange={(e) => {
      document.documentElement.classList.remove('theme-system', 'theme-dark', 'theme-light');
      document.documentElement.classList.add(`theme-${e.target.value}`);
    }}
    defaultValue="system"
  >
    <option value="system">System</option>
    <option value="dark">Dark</option>
    <option value="light">Light</option>
  </select>
  ```

## Key Performance Indicators

### Visual Impact
- **Orb Vibrancy**: 40% increase in color vibrancy on P3 displays
- **Surface Consistency**: Unified surface hierarchy across UI
- **Focus Clarity**: Focus indicators that exceed WCAG 2.2 requirements

### Performance
- **Animation Smoothness**: <10ms scripting/layout per frame
- **Paint Efficiency**: <4ms paint/composite on mid-tier devices
- **Memory Usage**: <50MB additional JS heap for all animations

### Developer Experience
- **Token Reduction**: Keep @theme block under 180 lines
- **Browser Compatibility**: 100% functional in Safari, Chrome, Firefox
- **Clean Fallbacks**: No visual degradation on non-P3 displays

## Technical Requirements

### Browser Support
- Safari 15+: Full OKLCH + display-P3 support
- Chrome 111+: Full OKLCH + display-P3 support
- Firefox: OKLCH support with dynamic chroma adjustment
- Edge: Follows Chrome compatibility

### Performance Budget
- Animation frame budget: <10ms total (script + style + layout)
- Paint/composite: <4ms on mid-tier mobile
- Total JavaScript: <100KB for animation utilities
- No layout thrashing during animations

## Implementation Strategy

### Progressive Enhancement
1. Core functionality works with standard CSS
2. Enhanced visuals with OKLCH where supported
3. Maximum vibrancy on display-P3 capable devices
4. Graceful fallbacks everywhere else

### Browser Detection Approach
- Feature detection over user-agent sniffing
- Runtime capability checks for critical features
- Tailored experiences based on detected support
- No blank screens or broken layouts anywhere