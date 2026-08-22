# Aaroogyam CRM 25-Seat Telephony Pilot

This phase is additive. The protected CRM baseline is not replaced.

## Pilot flow

1. Agent signs into existing Aaroogyam CRM.
2. Agent is mapped to a SIP extension and VICIdial user.
3. Dialer starts a call and sends a lifecycle event to the CRM bridge.
4. CRM opens the existing Call & Create Order workspace with the customer mobile number.
5. Existing customer lookup and Customer 360 remain the source of truth.
6. On call completion, the existing disposition layer records outcome and follow-up.
7. Call metadata and recording reference are written to `crm_call_events`.

## Start small

- Pilot 2 agents first.
- Validate login, extension mapping, outbound call, inbound call, ringing, answer, hangup, disposition, follow-up and order creation.
- Expand to 5 agents only after the first pilot is stable.
- Expand from 5 to 25 only after load and failure testing.

## Required infrastructure before live testing

- Linux VPS/server with public IP and stable network.
- Asterisk/VICIdial deployment.
- SIP trunk/carrier credentials.
- Test DID/number.
- Two test SIP extensions.
- HTTPS endpoint for the CRM telephony bridge.

## Security rule

Never put SIP trunk passwords, VICIdial database passwords or Asterisk manager secrets into `crm1/index.html`, browser JavaScript or a public GitHub repository. The browser only receives short-lived CRM session data and call metadata needed for the active workspace.

## CRM bridge event contract

Example event types:

- `call_started`
- `ringing`
- `answered`
- `hangup`
- `disposition_ready`
- `recording_ready`

Minimum payload fields:

- `call_id`
- `user_id` or mapped dialer user
- `mobile`
- `event_type`
- `event_at`

Optional fields:

- `lead_id`
- `customer_id`
- `campaign_id`
- `duration_seconds`
- `recording_reference`
- `disposition`

The bridge must be server-side. The existing browser CRM should never directly connect to Asterisk AMI or a VICIdial database.
