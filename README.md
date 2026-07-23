# Zetass Pos

Desktop & Mobile Point of Sale Application built with Electron, React, and Capacitor.

**Platform:** Windows, Linux, macOS, Android, iOS

## Download

Download the latest release from [GitHub Releases](https://github.com/WalZetass-kar/LCC-Web-Design/releases/latest).

## Screenshots

| Dashboard | POS | Products |
|-----------|-----|----------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![POS](docs/screenshots/pos.png) | ![Products](docs/screenshots/products.png) |

## Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS
- **Desktop:** Electron 31, Vite 5
- **Mobile:** Capacitor 8
- **Database:** SQLite (better-sqlite3), Drizzle ORM
- **Build:** Vite, electron-builder
- **CI/CD:** GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- JDK 17+ (for Android)
- Android SDK (for Android)

### Install Dependencies

```bash
pnpm install
```

### Development (Desktop)

```bash
npm run dev
```

### Development (Mobile/Android)

```bash
npm run dev:mobile
# In another terminal:
npm run android:open
```

## Build

### Build All (Desktop)

```bash
npm run build:desktop
```

### Build Windows

```bash
# Full build (NSIS Installer + Portable + ZIP)
npm run build:desktop:windows
# or
npx electron-builder --win nsis portable zip --publish never
```

**Output:** `release/` directory

- `Zetass Pos-2.0.0-x64.exe` - NSIS Installer
- `Zetass Pos-2.0.0-x64.exe` (portable) - Portable Executable
- `Zetass Pos-2.0.0-x64.zip` - ZIP Archive

### Build Linux

```bash
# Full build (AppImage + deb + rpm + tar.gz)
npm run build:desktop:linux
# or
npx electron-builder --linux AppImage deb rpm tar.gz --publish never
```

**Output:** `release/` directory

- `Zetass Pos-2.0.0-x64.AppImage` - AppImage
- `zetass-pos_2.0.0_amd64.deb` - Debian Package
- `zetass-pos-2.0.0-1.x86_64.rpm` - RPM Package
- `zetass-pos-2.0.0-x64.tar.gz` - Tarball

### Build Android

```bash
# Debug APK
npm run android:debug

# Release APK
npm run android:release

# AAB (Google Play)
npm run android:aab
```

**Output:** `release/` directory

- `ZetassPOS.apk` - Debug/Release APK
- `ZetassPOS.aab` - Android App Bundle

## Installation

### Windows

1. Download `Zetass Pos-2.0.0-x64.exe` (NSIS Installer)
2. Run the installer
3. Choose installation directory
4. Launch from Desktop or Start Menu

### Linux

**AppImage (Universal):**
```bash
chmod +x Zetass*.AppImage
./Zetass*.AppImage
```

**Debian/Ubuntu:**
```bash
sudo dpkg -i zetass-pos_*.deb
sudo apt-get install -f
```

**Fedora/RHEL:**
```bash
sudo rpm -i zetass-pos-*.rpm
```

### Android

1. Enable "Install from Unknown Sources"
2. Download and open the `.apk` file
3. Follow installation prompts

## Release Process

### Automated Release (Recommended)

1. Update version:
```bash
npm run release:patch   # v2.0.0 -> v2.0.1
npm run release:minor   # v2.0.0 -> v2.1.0
npm run release:major   # v2.0.0 -> v3.0.0
```

This will:
- Update `package.json` version
- Sync Android `versionCode` and `versionName`
- Create a git commit and tag
- Push to GitHub
- Trigger the Release workflow automatically

### Manual Release

```bash
# Create and push tag
git tag v2.0.0
git push origin v2.0.0
```

The GitHub Actions workflow will automatically:
1. Validate (lint, typecheck, test)
2. Build Windows (NSIS + Portable + ZIP)
3. Build Linux (AppImage + deb + rpm + tar.gz)
4. Build Android (Debug APK + Release APK + AAB)
5. Generate CHANGELOG
6. Create GitHub Release
7. Upload all artifacts

### Release Artifacts

| Platform | File | Description |
|----------|------|-------------|
| Windows | `*.exe` | NSIS Installer |
| Windows | `*.exe` (portable) | Portable Executable |
| Windows | `*.zip` | ZIP Archive |
| Linux | `*.AppImage` | Universal Linux Binary |
| Linux | `*.deb` | Debian/Ubuntu Package |
| Linux | `*.rpm` | Fedora/RHEL Package |
| Linux | `*.tar.gz` | Tarball |
| Android | `*.apk` | Android Package |
| Android | `*.aab` | Android App Bundle |

## Project Structure

```
LCC-Web-Design/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React frontend
│   ├── backend/           # Backend services
│   └── shared/            # Shared code
├── android/               # Capacitor Android
├── ios/                   # Capacitor iOS
├── build/                 # Build resources (icons)
├── scripts/               # Build & release scripts
├── .github/workflows/     # CI/CD workflows
├── package.json           # Electron config
├── capacitor.config.ts    # Capacitor config
├── vite.config.ts         # Vite config
├── tsconfig.json          # TypeScript config
└── tsconfig.electron.json # Electron TypeScript config
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start desktop development |
| `npm run dev:mobile` | Start mobile dev server |
| `npm run build:desktop` | Build desktop (all platforms) |
| `npm run build:desktop:windows` | Build for Windows |
| `npm run build:desktop:linux` | Build for Linux |
| `npm run android:debug` | Build Android debug APK |
| `npm run android:release` | Build Android release APK |
| `npm run android:aab` | Build Android AAB |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run release:patch` | Release patch version |
| `npm run release:minor` | Release minor version |
| `npm run release:major` | Release major version |

## Security

- `.env` files are gitignored
- `.keys/` directory is gitignored
- Keystores and certificates are never committed
- API keys stored in environment variables
- Context isolation enabled in Electron
- Certificate pinning for Android network requests

## License

MIT License

## Author

Zetass Pos
