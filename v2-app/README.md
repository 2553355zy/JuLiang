# JuLiang V2

Second-generation OceanEngine ROI operations console.

## Current Scope

This is the V2 product skeleton and UI design branch. It includes:

- React + Vite + TypeScript app shell
- high-density operator dashboard UI
- account ROI sample data
- ROI recommendation engine skeleton
- material-name-to-novel parser skeleton
- Feishu notification draft builder

Electron packaging is intentionally not wired yet because Electron binary installation was unstable in the current network environment. The web shell is runnable now and can be wrapped by Electron after the dependency install is stable.

## Commands

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

Dev URL:

```text
http://127.0.0.1:5173
```

## Security

Do not copy secrets from the V1 package into this app. Runtime tokens, refresh tokens, app secrets, and Feishu webhook URLs must come from secure runtime configuration.
