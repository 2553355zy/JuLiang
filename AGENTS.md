# JuLiang Monitor V2 Project Rules

## Project Scope

This folder contains the first internal packaged build of the OceanEngine monitor and the planning workspace for the second-generation product.

Treat the existing packaged app as a reference artifact only. Do not modify `_internal` or reverse-engineered bundled files as the primary development path. New source code, docs, and product decisions should live in explicit V2 folders under this project root.

## Product Goal

Build a second-generation desktop/web product for comprehensive OceanEngine account analysis and operations. The product must help improve ROI by combining:

- account, campaign, project, promotion, creative, material, and fund analysis
- safe operational controls for budgets, status, recharge, transfer, close, and clear-money actions
- creative performance mining, including extracting novel names from successful material names
- Feishu notifications to the responsible person for each account or material owner

## Security Rules

- Never commit or package real `access_token`, `refresh_token`, app `secret`, webhook URL, Feishu app secret, or account credentials.
- Runtime secrets must be stored in the OS credential store, encrypted local config, environment variables, or a backend service.
- Example config files must use placeholders only.
- Any destructive or money-moving operation must support preview first, require explicit confirmation text, record an audit log, and be idempotent where possible.
- Real execution defaults to off in development and test builds.

## Development Direction

- Prefer TypeScript + React + Vite + Electron for the V2 app unless a later architecture decision changes this.
- Keep the domain layer independent from UI and platform shells.
- Keep API clients, token refresh, rate limiting, retry, audit logging, and job scheduling as separate modules.
- Model OceanEngine data as time-series facts first, then derive dashboards, alerts, and recommendations from those facts.
- Store normalized historical metrics locally so ROI and material trend analysis does not depend only on live API calls.

## Product Analysis Defaults

The V2 product should analyze:

- spend, balance, budget, impressions, clicks, CTR, CPC, conversion count, conversion cost, revenue, ROI, profit, payback windows, and abnormal changes
- dimensions including account, organization, project/campaign, promotion/ad, creative/material, keyword/search term, placement, landing page, novel name, operator, and responsible person
- operational states including running, paused, closed, low balance, high cost, zero-conversion spend, fast spend, ROI recovery, and scaling candidates

## Feishu Notification Rules

- Feishu alerts should be event-driven, deduplicated, and routed to a responsible person or group.
- Notifications must include the account, material name, extracted novel name, performance evidence, suggested action, and links back to the product.
- Use message cards for structured alerts when possible. Plain text webhook messages are acceptable only for the first MVP.

## Documentation Rules

- Keep stable product rules in this file.
- Keep product plans and research in `docs/`.
- Keep implementation decisions that are hard to reverse in `docs/adr/`.
- Keep workflow packaging candidates in docs first; create a skill, plugin, or automation only when the repeated workflow is clear and high confidence.

