# Asraya OS v3.4

A personal AI Operating System built with Next.js, Tailwind CSS 4.0, and Zustand.

## Features

- **AI-Powered Chat**: Engage with AI assistants in natural conversation
- **Responsive Layout System**: Dynamic panel-based UI that adapts to different screen sizes
- **Theming**: Complete theme system with light/dark mode support
- **Animation**: GSAP animations for smooth transitions and interactions

## Tech Stack

- **Framework**: Next.js 15+
- **Styling**: Tailwind CSS 4.0 with OKLCH color system
- **State Management**: Zustand for global state
- **Animation**: GSAP and Framer Motion
- **Typography**: Geist font family

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/(main)` - Main application routes
- `src/app/(onboarding)` - Onboarding flow
- `src/components` - Reusable UI components
- `src/features` - Feature-specific components
- `src/hooks` - Custom React hooks
- `src/lib` - Utilities, state management, and core functionality

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run clean` - Remove build outputs
- `npm run format` - Format code with Prettier

## Deployment

The project is configured for easy deployment on Vercel or any other hosting platform that supports Next.js.

```bash
npm run build
```

## License

[MIT](LICENSE)