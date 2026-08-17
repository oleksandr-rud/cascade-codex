# Synthetic Feature Packet: Provider Callback Contract Unavailable

All names and systems in this packet are fictional.

## Request

Specify the payload, callback, and reconciliation behavior for sending approved
inspection certificates to fictional provider CertPort. The result must be safe
for engineering implementation.

## Approved Product Source `PROD-081`

- A compliance manager submits one approved certificate and receives a durable
  local operation ID.
- The product distinguishes pending, confirmed, and action-required states.
- A timeout is not proof that CertPort rejected the certificate.
- The manager must never submit a second certificate while the first outcome is
  unknown.
- The product needs a manual “Check status” recovery action.

## Provider Portal Capture `SHOT-018`

The approved screenshot shows a CertPort page with “Received” and “Confirmed”
labels. It does not identify an API version, fields, authentication method,
idempotency behavior, callback signature, error codes, or lookup operation.

## Missing Authority `CERTPORT-API-4`

`CERTPORT-API-4` is the only approved provider contract. Its repository link
returns access denied, and no cached copy or generated client is available.
The Provider Integrations team owns the contract and can restore access. The
product owner and screenshot owner do not have authority to define provider
payloads or callbacks.

## Current Evidence

The repository contains only a placeholder adapter interface. No provider
request, callback, reconciliation implementation, contract test, or live
provider evidence exists. Do not infer interface fields or security rules from
the screenshot.
