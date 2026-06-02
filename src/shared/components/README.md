# Shared Components

Renderer UI components currently live in `src/renderer/components` because the
Electron/backend TypeScript build also consumes `src/shared`.

Move only truly cross-app, renderer-only components here after the build configs
are split enough to exclude JSX from the Electron backend build.
