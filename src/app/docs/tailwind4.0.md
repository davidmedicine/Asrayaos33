Tailwind CSS v4.0 is an all-new version of the framework optimized for performance and flexibility, with a reimagined configuration and customization experience, and taking full advantage of the latest advancements the web platform has to offer. 

New high-performance engine — where full builds are up to 5x faster, and incremental builds are over 100x faster — and measured in microseconds.
Designed for the modern web — built on cutting-edge CSS features like cascade layers, registered custom properties with @property, and color-mix().
Simplified installation — fewer dependencies, zero configuration, and just a single line of code in your CSS file.
First-party Vite plugin — tight integration for maximum performance and minimum configuration.
Automatic content detection — all of your template files are discovered automatically, with no configuration required.
Built-in import support — no additional tooling necessary to bundle multiple CSS files.
CSS-first configuration — a reimagined developer experience where you customize and extend the framework directly in CSS instead of a JavaScript configuration file.
CSS theme variables — all of your design tokens exposed as native CSS variables so you can access them anywhere.
Dynamic utility values and variants — stop guessing what values exist in your spacing scale, or extending your configuration for things like basic data attributes.
Modernized P3 color palette — a redesigned, more vivid color palette that takes full advantage of modern display technology.
Container queries — first-class APIs for styling elements based on their container size, no plugins required.
New 3D transform utilities — transform elements in 3D space directly in your HTML.
Expanded gradient APIs — radial and conic gradients, interpolation modes, and more.
@starting-style support — a new variant you can use to create enter and exit transitions, without the need for JavaScript.
not-* variant — style an element only when it doesn't match another variant, custom selector, or media or feature query.
Even more new utilities and variants — including support for color-scheme, field-sizing, complex shadows, inert, and more.
Start using Tailwind CSS v4.0 today by installing it in a new project, or playing with it directly in the browser on Tailwind Play.

For existing projects, we've published a comprehensive upgrade guide and built an automated upgrade tool to get you on the latest version as quickly and painlessly as possible.

New high-performance engine
Tailwind CSS v4.0 is a ground-up rewrite of the framework, taking everything we've learned about the architecture over the years and optimizing it to be as fast as possible.

When benchmarking it on our own projects, we've found full rebuilds to be over 3.5x faster, and incremental builds to be over 8x faster.

Here are the median build times we saw when we benchmarked Tailwind CSS v4.0 against Catalyst:

v3.4	v4.0	Improvement
Full build	378ms	100ms	3.78x
Incremental rebuild with new CSS	44ms	5ms	8.8x
Incremental rebuild with no new CSS	35ms	192µs	182x
The most impressive improvement is on incremental builds that don't actually need to compile any new CSS — these builds are over 100x faster and complete in microseconds. And the longer you work on a project, the more of these builds you run into because you're just using classes you've already used before, like flex, col-span-2, or font-bold.

Designed for the modern web
The platform has evolved a lot since we released Tailwind CSS v3.0, and v4.0 takes full advantage of many of these improvements.

CSS
@layer theme, base, components, utilities;
@layer utilities {
  .mx-6 {
    margin-inline: calc(var(--spacing) * 6);
  }
  .bg-blue-500\/50 {
    background-color: color-mix(in oklab, var(--color-blue-500) 50%, transparent);
  }
}
@property --tw-gradient-from {
  syntax: "<color>";
  inherits: false;
  initial-value: #0000;
}
We're leveraging modern CSS features like:

Native cascade layers — giving us more control than ever over how different style rules interact with each other.
Registered custom properties — making it possible to do things like animate gradients, and significantly improving performance on large pages.
color-mix() — which lets us adjust the opacity of any color value, including CSS variables and currentColor.
Logical properties — simplifying RTL support and reducing the size of your generated CSS.
Many of these features have even simplified Tailwind internally, reducing the surface area for bugs and making the framework easier for us to maintain.

Simplified installation
We've streamlined the setup process a ton in v4.0, reducing the number of steps and removing a lot of boilerplate.

1. Install Tailwind CSS
npm i tailwindcss @tailwindcss/postcss;
2. Add the PostCSS plugin
export default {
  plugins: ["@tailwindcss/postcss"],
};
3. Import Tailwind in your CSS
@import "tailwindcss";
With the improvements we've made to this process for v4.0, Tailwind feels more light-weight than ever:

Just one-line of CSS — no more @tailwind directives, just add @import "tailwindcss" and start building.
Zero configuration — you can start using the framework without configuring anything, not even the paths to your template files.
No external plugins required — we bundle @import rules for you out of the box, and use Lightning CSS under the hood for vendor prefixing and modern syntax transforms.
Sure you only go through this once per project, but it adds up when you're starting and abandoning a different side-project every weekend.

First-party Vite plugin
If you're a Vite user, you can now integrate Tailwind using @tailwindcss/vite instead of PostCSS:

vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
});
Tailwind CSS v4.0 is incredibly fast when used as a PostCSS plugin, but you'll get even better performance using the Vite plugin.

Automatic content detection
You know how you always had to configure that annoying content array in Tailwind CSS v3? In v4.0, we came up with a bunch of heuristics for detecting all of that stuff automatically so you don’t have to configure it at all.

For example, we automatically ignore anything in your .gitignore file to avoid scanning dependencies or generated files that aren’t under version control:

.gitignore
/node_modules
/coverage
/.next/
/build
We also automatically ignore all binary extensions like images, videos, .zip files, and more.

And if you ever need to explicitly add a source that's excluded by default, you can always add it with the @source directive, right in your CSS file:

CSS
@import "tailwindcss";
@source "../node_modules/@my-company/ui-lib";
The @source directive uses the same heuristics under the hood, so it will exclude binary file types for example as well, without you having to specify all of the extensions to scan explicitly.

Learn more about in our new documentation on detecting classes in source files.

Built-in import support
Before v4.0, if you wanted to inline other CSS files using @import you'd have to configure another plugin like postcss-import to handle it for you.

Now we handle this out of the box, so you don't need any other tools:

postcss.config.js
export default {
  plugins: [
    "postcss-import",
    "@tailwindcss/postcss",
  ],
};
Our import system is purpose-built for Tailwind CSS, so we've also been able to make it even faster by tightly integrating it with our engine.

CSS-first configuration
One of the biggest changes in Tailwind CSS v4.0 is the shift from configuring your project in JavaScript to configuring it in CSS.

Instead of a tailwind.config.js file, you can configure all of your customizations directly in the CSS file where you import Tailwind, giving you one less file to worry about in your project:

CSS
@import "tailwindcss";
@theme {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 1920px;
  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}
The new CSS-first configuration lets you do just about everything you could do in your tailwind.config.js file, including configuring your design tokens, defining custom utilities and variants, and more.

To learn more about how it all works, read the new theme variables documentation.

CSS theme variables
Tailwind CSS v4.0 takes all of your design tokens and makes them available as CSS variables by default, so you can reference any value you need at run-time using just CSS.

Using the example @theme from earlier, all of these values will be added to your CSS to as regular custom properties:

Generated CSS
:root {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 1920px;
  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}
This makes it easy to reuse these values as inline styles or pass them to libraries like Motion to animate them.

Dynamic utility values and variants
We've simplified the way many utilities and variants work in v4.0 by effectively allowing them to accept certain types of arbitrary values, without the need for any configuration or dropping down to the arbitrary value syntax.

For example, in Tailwind CSS v4.0 you can create grids of any size out of the box:

HTML
<div class="grid grid-cols-15">
  <!-- ... -->
</div>
You can also target custom boolean data attributes without needing to define them:

HTML
<div data-current class="opacity-75 data-current:opacity-100">
  <!-- ... -->
</div>
Even spacing utilities like px-*, mt-*, w-*, h-*, and more are now dynamically derived from a single spacing scale variable and accept any value out of the box:

Generated CSS
@layer theme {
  :root {
    --spacing: 0.25rem;
  }
}
@layer utilities {
  .mt-8 {
    margin-top: calc(var(--spacing) * 8);
  }
  .w-17 {
    width: calc(var(--spacing) * 17);
  }
  .pr-29 {
    padding-right: calc(var(--spacing) * 29);
  }
}
The upgrade tool we released alongside v4.0 will even simplify most of these utilities for you automatically if it notices you using an arbitrary value that's no longer needed.

Modernized P3 color palette
We've upgraded the entire default color palette from rgb to oklch, taking advantage of the wider gamut to make the colors more vivid in places where we were previously limited by the sRGB color space.

We've tried to keep the balance between all the colors the same as it was in v3, so even though we've refreshed things across the board, it shouldn't feel like a breaking change when upgrading your existing projects.

Container queries
We've brought container query support into core for v4.0, so you don't need the @tailwindcss/container-queries plugin anymore:

HTML
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-3 @lg:grid-cols-4">
    <!-- ... -->
  </div>
</div>
We've also added support for max-width container queries using the new @max-* variant:

HTML
<div class="@container">
  <div class="grid grid-cols-3 @max-md:grid-cols-1">
    <!-- ... -->
  </div>
</div>
Like our regular breakpoint variants, you can also stack @min-* and @max-* variants to define container query ranges:

HTML
<div class="@container">
  <div class="flex @min-md:@max-xl:hidden">
    <!-- ... -->
  </div>
</div>
Learn more in our all-new container queries documentation.

New 3D transform utilities
We've finally added APIs for doing 3D transforms, like rotate-x-*, rotate-y-*, scale-z-*, translate-z-*, and tons more.


Mar 16, 2020
Michael Foster
Boost your conversion rate

<div class="perspective-distant">
  <article class="rotate-x-51 rotate-z-43 transform-3d ...">
    <!-- ... -->
  </article>
</div>
Check out the updated transform-style, rotate, perspective, and perspective-origin documentation to get started.

Expanded gradient APIs
We've added a ton of new gradient features in v4.0, so you can pull off even fancier effects without having to write any custom CSS.

Linear gradient angles
Linear gradients now support angles as values, so you can use utilities like bg-linear-45 to create a gradient on a 45 degree angle:

<div class="bg-linear-45 from-indigo-500 via-purple-500 to-pink-500"></div>
You may notice we've renamed bg-gradient-* to bg-linear-* too — you'll see why shortly!

Gradient interpolation modifiers
We've added the ability to control the color interpolation mode for gradients using a modifier, so a class like bg-linear-to-r/srgb interpolates using sRGB, and bg-linear-to-r/oklch interpolates using OKLCH:

<div class="bg-linear-to-r/srgb from-indigo-500 to-teal-400">...</div>
<div class="bg-linear-to-r/oklch from-indigo-500 to-teal-400">...</div>
Using polar color spaces like OKLCH or HSL can lead to much more vivid gradients when the from-* and to-* colors are far apart on the color wheel. We're using OKLAB by default in v4.0 but you can always interpolate using a different color space by adding one of these modifiers.

Conic and radial gradients
We've added new bg-conic-* and bg-radial-* utilities for creating conic and radial gradients:

<div class="size-24 rounded-full bg-conic/[in_hsl_longer_hue] from-red-600 to-red-600"></div>
<div class="size-24 rounded-full bg-radial-[at_25%_25%] from-white to-zinc-900 to-75%"></div>
These new utilities work alongside the existing from-*, via-*, and to-* utilities to let you create conic and radial gradients the same way you create linear gradients, and include modifiers for setting the color interpolation method and arbitrary value support for controlling details like the gradient position.

@starting-style support
The new starting variant adds support for the new CSS @starting-style feature, making it possible to transition element properties when an element is first displayed:


<div>
  <button popovertarget="my-popover">Check for updates</button>
  <div popover id="my-popover" class="transition-discrete starting:open:opacity-0 ...">
    <!-- ... -->
  </div>
</div>
With @starting-style, you can finally animate elements as they appear on the page without the need for any JavaScript at all. Browser support probably isn't quite there yet for most teams, but we're getting close!

not-* variant
We've added a new not-* variant which finally adds support for the CSS :not() pseudo-class:

HTML
<div class="not-hover:opacity-75">
  <!-- ... -->
</div>
CSS
.not-hover\:opacity-75:not(*:hover) {
  opacity: 75%;
}
@media not (hover: hover) {
  .not-hover\:opacity-75 {
    opacity: 75%;
  }
}
It does double duty and also lets you negate media queries and @supports queries:

HTML
<div class="not-supports-hanging-punctuation:px-4">
  <!-- ... -->
</div>
CSS
.not-supports-hanging-punctuation\:px-4 {
  @supports not (hanging-punctuation: var(--tw)) {
    padding-inline: calc(var(--spacing) * 4);
  }
}
Check out the new not-* documentation to learn more.

Even more new utilities and variants
We've added a ton of other new utilities and variants to v4.0 too, including:

New inset-shadow-* and inset-ring-* utilities — making it possible to stack up to four layers of box shadows on a single element.
New field-sizing utilities — for auto-resizing textareas without writing a single line of JavaScript.
New color-scheme utilities — so you can finally get rid of those ugly light scrollbars in dark mode.
New font-stretch utilities — for carefully tweaking variable fonts that support different widths.
New inert variant — for styling non-interactive elements marked with the inert attribute.
New nth-* variants — for doing really clever things you'll eventually regret.
New in-* variant — which is a lot like group-*, but without the need for the group class.
Support for :popover-open — using the existing open variant to also target open popovers.
New descendant variant — for styling all descendant elements, for better or for worse.
Check out the relevant documentation for all of these features to learn more.
Customizing your theme
If you want to change things like your color palette, spacing scale, typography scale, or breakpoints, add your customizations using the @theme directive in your CSS:

CSS
@theme {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 120rem;
  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}
Learn more about customizing your theme in the theme variables documentation.

Using arbitrary values
While you can usually build the bulk of a well-crafted design using a constrained set of design tokens, once in a while you need to break out of those constraints to get things pixel-perfect.

When you find yourself really needing something like top: 117px to get a background image in just the right spot, use Tailwind's square bracket notation to generate a class on the fly with any arbitrary value:

HTML
<div class="top-[117px]">
  <!-- ... -->
</div>
This is basically like inline styles, with the major benefit that you can combine it with interactive modifiers like hover and responsive modifiers like lg:

HTML
<div class="top-[117px] lg:top-[344px]">
  <!-- ... -->
</div>
This works for everything in the framework, including things like background colors, font sizes, pseudo-element content, and more:

HTML
<div class="bg-[#bada55] text-[22px] before:content-['Festivus']">
  <!-- ... -->
</div>
If you're referencing a CSS variable as an arbitrary value, you can use the custom property syntax:

HTML
<div class="fill-(--my-brand-color) ...">
  <!-- ... -->
</div>
This is just a shorthand for fill-[var(--my-brand-color)] that adds the var() function for you automatically.

Arbitrary properties
If you ever need to use a CSS property that Tailwind doesn't include a utility for out of the box, you can also use square bracket notation to write completely arbitrary CSS:

HTML
<div class="[mask-type:luminance]">
  <!-- ... -->
</div>
This is really like inline styles, but again with the benefit that you can use modifiers:

HTML
<div class="[mask-type:luminance] hover:[mask-type:alpha]">
  <!-- ... -->
</div>
This can be useful for things like CSS variables as well, especially when they need to change under different conditions:

HTML
<div class="[--scroll-offset:56px] lg:[--scroll-offset:44px]">
  <!-- ... -->
</div>
Arbitrary variants
Arbitrary variants are like arbitrary values but for doing on-the-fly selector modification, like you can with built-in pseudo-class variants like hover:{utility} or responsive variants like md:{utility} but using square bracket notation directly in your HTML.

HTML
<ul role="list">
  {#each items as item}
  <li class="lg:[&:nth-child(-n+3)]:hover:underline">{item}</li>
  {/each}
</ul>
Learn more in the arbitrary variants documentation.

Handling whitespace
When an arbitrary value needs to contain a space, use an underscore (_) instead and Tailwind will automatically convert it to a space at build-time:

HTML
<div class="grid grid-cols-[1fr_500px_2fr]">
  <!-- ... -->
</div>
In situations where underscores are common but spaces are invalid, Tailwind will preserve the underscore instead of converting it to a space, for example in URLs:

HTML
<div class="bg-[url('/what_a_rush.png')]">
  <!-- ... -->
</div>
In the rare case that you actually need to use an underscore but it's ambiguous because a space is valid as well, escape the underscore with a backslash and Tailwind won't convert it to a space:

HTML
<div class="before:content-['hello\_world']">
  <!-- ... -->
</div>
If you're using something like JSX where the backslash is stripped from the rendered HTML, use String.raw() so the backslash isn't treated as a JavaScript escape character:

<div className={String.raw`before:content-['hello\_world']`}>
  <!-- ... -->
</div>
Resolving ambiguities
Many utilities in Tailwind share a common namespace but map to different CSS properties. For example text-lg and text-black both share the text- namespace, but one is for font-size and the other is for color.

When using arbitrary values, Tailwind can generally handle this ambiguity automatically based on the value you pass in:

HTML
<!-- Will generate a font-size utility -->
<div class="text-[22px]">...</div>
<!-- Will generate a color utility -->
<div class="text-[#bada55]">...</div>
Sometimes it really is ambiguous though, for example when using CSS variables:

HTML
<div class="text-(--my-var)">...</div>
In these situations, you can "hint" the underlying type to Tailwind by adding a CSS data type before the value:

HTML
<!-- Will generate a font-size utility -->
<div class="text-(length:--my-var)">...</div>
<!-- Will generate a color utility -->
<div class="text-(color:--my-var)">...</div>
Using custom CSS
While Tailwind is designed to handle the bulk of your styling needs, there is nothing stopping you from just writing plain CSS when you need to:

CSS
@import "tailwindcss";
.my-custom-style {
  /* ... */
}
Adding base styles
If you just want to set some defaults for the page (like the text color, background color, or font family), the easiest option is just adding some classes to the html or body elements:

HTML
<!doctype html>
<html lang="en" class="bg-gray-100 font-serif text-gray-900">
  <!-- ... -->
</html>
This keeps your base styling decisions in your markup alongside all of your other styles, instead of hiding them in a separate file.

If you want to add your own default base styles for specific HTML elements, use the @layer directive to add those styles to Tailwind's base layer:

CSS
@layer base {
  h1 {
    font-size: var(--text-2xl);
  }
  h2 {
    font-size: var(--text-xl);
  }
}
Adding component classes
Use the components layer for any more complicated classes you want to add to your project that you'd still like to be able to override with utility classes.

Traditionally these would be classes like card, btn, badge — that kind of thing.

CSS
@layer components {
  .card {
    background-color: var(--color-white);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-6);
    box-shadow: var(--shadow-xl);
  }
}
By defining component classes in the components layer, you can still use utility classes to override them when necessary:

HTML
<!-- Will look like a card, but with square corners -->
<div class="card rounded-none">
  <!-- ... -->
</div>
Using Tailwind you probably don't need these types of classes as often as you think. Read our guide on managing duplication for our recommendations.

The components layer is also a good place to put custom styles for any third-party components you're using:

CSS
@layer components {
  .select2-dropdown {
    /* ... */
  }
}
Using variants
Use the @variant directive to apply a Tailwind variant within custom CSS:

app.css
.my-element {
  background: white;
  @variant dark {
    background: black;
  }
}
Compiled CSS
.my-element {
  background: white;
  @media (prefers-color-scheme: dark) {
    background: black;
  }
}
If you need to apply multiple variants at the same time, use nesting:

app.css
.my-element {
  background: white;
  @variant dark {
    @variant hover {
      background: black;
    }
  }
}
Compiled CSS
.my-element {
  background: white;
  @media (prefers-color-scheme: dark) {
    &:hover {
      @media (hover: hover) {
        background: black;
      }
    }
  }
}
Adding custom utilities
Simple utilities
In addition to using the utilities that ship with Tailwind, you can also add your own custom utilities. This can be useful when there's a CSS feature you'd like to use in your project that Tailwind doesn't include utilities for out of the box.

Use the @utility directive to add a custom utility to your project:

CSS
@utility content-auto {
  content-visibility: auto;
}
You can now use this utility in your HTML:

HTML
<div class="content-auto">
  <!-- ... -->
</div>
It will also work with variants like hover, focus and lg:

HTML
<div class="hover:content-auto">
  <!-- ... -->
</div>
Custom utilities are automatically inserted into the utilities layer along with all of the built-in utilities in the framework.

Complex utilities
If your custom utility is more complex than a single class name, use nesting to define the utility:

CSS
@utility scrollbar-hidden {
  &::-webkit-scrollbar {
    display: none;
  }
}
Functional utilities
In addition to registering simple utilities with the @utility directive, you can also register functional utilities that accept an argument:

CSS
@utility tab-* {
  tab-size: --value(--tab-size-*);
}
The special --value() function is used to resolve the utility value.

Matching theme values
Use the --value(--theme-key-*) syntax to resolve the utility value against a set of theme keys:

CSS
@theme {
  --tab-size-2: 2;
  --tab-size-4: 4;
  --tab-size-github: 8;
}
@utility tab-* {
  tab-size: --value(--tab-size-*);
}
This will match utilities like tab-2, tab-4, and tab-github.

Bare values
To resolve the value as a bare value, use the --value({type}) syntax, where {type} is the data type you want to validate the bare value as:

CSS
@utility tab-* {
  tab-size: --value(integer);
}
This will match utilities like tab-1 and tab-76.

Literal values
To support literal values, use the --value('literal') syntax (notice the quotes):

CSS
@utility tab-* {
  tab-size: --value('inherit', 'initial', 'unset');
}
This will match utilities like tab-inherit, tab-initial, and tab-unset.

Arbitrary values
To support arbitrary values, use the --value([{type}]) syntax (notice the square brackets) to tell Tailwind which types are supported as an arbitrary value:

CSS
@utility tab-* {
  tab-size: --value([integer]);
}
This will match utilities like tab-[1] and tab-[76]. If you want to support any data type, you can use --value([*]).

Supporting theme, bare, and arbitrary values together
All three forms of the --value() function can be used within a rule as multiple declarations, and any declarations that fail to resolve will be omitted in the output:

CSS
@theme {
  --tab-size-github: 8;
}
@utility tab-* {
  tab-size: --value([integer]);
  tab-size: --value(integer);
  tab-size: --value(--tab-size-*);
}
This makes it possible to treat the value differently in each case if necessary, for example translating a bare integer to a percentage:

CSS
@utility opacity-* {
  opacity: --value([percentage]);
  opacity: calc(--value(integer) * 1%);
  opacity: --value(--opacity-*);
}
The --value() function can also take multiple arguments and resolve them left to right if you don't need to treat the return value differently in different cases:

CSS
@theme {
  --tab-size-github: 8;
}
@utility tab-* {
  tab-size: --value(--tab-size-*, integer, [integer]);
}
@utility opacity-* {
  opacity: calc(--value(integer) * 1%);
  opacity: --value(--opacity-*, [percentage]);
}
Negative values
To support negative values, register separate positive and negative utilities into separate declarations:

CSS
@utility inset-* {
  inset: calc(var(--spacing) * --value([percentage], [length]));
}
@utility -inset-* {
  inset: calc(var(--spacing) * --value([percentage], [length]) * -1);
}
Modifiers
Modifiers are handled using the --modifier() function which works exactly like the --value() function but operates on a modifier if present:

CSS
@utility text-* {
  font-size: --value(--text-*, [length]);
  line-height: --modifier(--leading-*, [length], [*]);
}
If a modifier isn't present, any declaration depending on a modifier is just not included in the output.

Fractions
To handle fractions, we rely on the CSS ratio data type. If this is used with --value(), it's a signal to Tailwind to treat the value and modifier as a single value:

CSS
@utility aspect-* {
  aspect-ratio: --value(--aspect-ratio-*, ratio, [ratio]);
}
This will match utilities like aspect-square, aspect-3/4, and aspect-[7/9].

Adding custom variants
In addition to using the variants that ship with Tailwind, you can also add your own custom variants using the @custom-variant directive:

@custom-variant theme-midnight {
  &:where([data-theme="midnight"] *) {
    @slot;
  }
}
Now you can use the theme-midnight:<utility> variant in your HTML:

<html data-theme="midnight">
  <button class="theme-midnight:bg-black ..."></button>
</html>
You can create variants using the shorthand syntax when nesting isn't required:

@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
When a custom variant has multiple rules, they can be nested within each other:

@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}
 