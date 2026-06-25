# JuLiang V2 Release Checklist

## Required Before Any Test Build

- Run `pnpm release:check` from `v2-app`.
- Confirm no real OceanEngine token, refresh token, app secret, Feishu webhook, or account credential is tracked.
- Confirm V1 package artifacts remain ignored: root exe, `_internal/`, `desktop/`, temporary exe, and `.bak` files.
- Confirm `JULIANG_EXECUTION_MODE` is `readonly` or `preview` for internal testing.
- Confirm `JULIANG_OPERATION_ALLOWLIST` is empty unless a reviewed test account is explicitly approved.
- Confirm all money-moving and delivery-changing actions remain preview-only unless explicitly approved.

## Required Before Live Operations

- Token custody decision documented.
- Operation audit log persistence verified.
- Confirmation words verified for high-risk actions.
- Account operation allowlist verified.
- Feishu notification dedupe verified.
- Backout plan documented.
- V1 package preserved separately for rollback/reference.

## Current Release State

The current branch is a functional skeleton and UI integration build. Operation audit can persist through the Electron main process, but the build is not ready for live OceanEngine operations until database-backed audit/history, account allowlists, and operation rollback checks are verified.
