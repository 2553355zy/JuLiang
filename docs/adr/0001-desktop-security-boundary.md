# ADR 0001: Desktop Security Boundary

## Status

Accepted

## Context

The V1 internal package kept real OceanEngine credentials in a packaged local config file. V2 needs to support account analysis, budget and status operations, money transfer, clear-money flows, and Feishu notifications. These operations are high impact and must not run directly from unreviewed UI state.

## Decision

V2 separates the product into a renderer UI, a desktop shell, and explicit service modules. The renderer may request status, previews, and drafts, but real OceanEngine and Feishu secrets must come from secure runtime configuration. Live operations are disabled by default.

Every money-moving or delivery-changing action must pass through an operation plan with:

- previewable target and action
- risk level
- explicit confirmation requirement
- audit-log write before and after execution
- idempotency key where the upstream API allows it

## Consequences

- The UI can be developed and tested with mock data without exposing secrets.
- Electron preload exposes only named business methods, not filesystem or Node primitives.
- V2 can later move token custody to a small backend without rewriting the renderer.
- Early MVP work focuses on read-only diagnostics and operation previews before live execution.

