# ADR 0002: OceanEngine Write Dry-Run Boundary

## Status

Accepted for V2 skeleton.

## Context

JuLiang V2 is moving toward real OceanEngine account operations, but write calls can change delivery and spend. The app already has preview, live gate, account allowlist, confirmation words, state snapshot, and audit records. The next boundary must make write intent visible without sending any write request.

OceanEngine SDK references list these relevant write endpoints:

- Account budget update: `POST /open_api/2/advertiser/update/budget/`
- Project budget update: `POST /open_api/v3.0/project/budget/update/`
- Promotion budget update: `POST /open_api/v3.0/promotion/budget/update/`
- Project status update: `POST /open_api/v3.0/project/status/update/`
- Promotion status update: `POST /open_api/v3.0/promotion/status/update/`
- Local budget update: `POST /open_api/v3.0/local/budget/update/`

Sources checked on 2026-06-25:

- https://github.com/oceanengine/ad_open_sdk_java/blob/main/README.md
- https://pkg.go.dev/github.com/oceanengine/ad_open_sdk_go

## Decision

Keep live write execution disabled by default. The Electron write executor returns a dry-run request mapping unless the runtime explicitly enables live write mode and confirms the exact endpoint.

Current mappings:

| Operation | Target level | Dry-run endpoint | Status |
| --- | --- | --- | --- |
| `adjust_budget` | account | `/open_api/2/advertiser/update/budget/` | mapped candidate, endpoint confirmation required |
| `pause` | account | `unmapped:account-status` | blocked |
| `resume` | account | `unmapped:account-status` | blocked |
| `close` | account | `unmapped:account-status` | blocked |

Budget dry-run body:

```json
{
  "advertiser_id": "<account id>",
  "budget": "<expected budget after adjustment>"
}
```

Status operations remain blocked because the currently generated operation plans are account-level, while verified SDK status endpoints are project/promotion-level. We should not silently map account-level status actions to project or promotion endpoints.

## Safety Rules

Live POST remains unavailable until all of these are true:

- `JULIANG_EXECUTION_MODE=live`
- `JULIANG_ENABLE_OCEANENGINE_WRITE=true`
- `JULIANG_CONFIRMED_OCEANENGINE_WRITE_ENDPOINTS` includes the exact endpoint, such as `/open_api/2/advertiser/update/budget/`
- `OCEANENGINE_ACCESS_TOKEN` is configured at runtime
- target account is in `JULIANG_OPERATION_ALLOWLIST`
- confirmation keyword matches
- pre-operation state snapshot is available
- audit record is written
- endpoint and request body are reviewed against the official OceanEngine docs for the exact account type
- post-operation verification is implemented for every changed field

The execution service must read account state again after a successful write response and compare every expected changed field. If the API response succeeds but the post-operation state does not match the expected budget or status, the result status is `verification_failed` and the audit log must preserve that state for manual review.

## Consequences

The UI can show the exact dry-run endpoint and body during real execution checks. This makes the next real integration auditable and keeps destructive or money-moving operations off until the endpoint and account type are confirmed. When the endpoint is confirmed later, the same Electron boundary can perform the POST without moving write logic into React UI code.
