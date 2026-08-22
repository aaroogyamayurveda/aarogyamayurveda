# 25-Seater Telephony + CRM Plan

## Protected CRM baseline
Current tested baseline is preserved on branch `crm1-final-working-base-current` and includes commit `e18769eb00addeb83470e0ecd6e46249e846e261` plus the latest working interaction fix already present on main.

## Target architecture
Agent Browser CRM -> SIP softphone (X-Lite/compatible SIP client) -> Asterisk -> VICIdial dialer -> carrier/SIP trunk.

The existing CRM remains the agent workspace and receives telephony events: call start, ringing, answered, hangup, disposition-ready, and recording metadata.

## Phase 1: Infrastructure
1. Provision Linux server for Asterisk/VICIdial.
2. Configure static/public networking, DNS and TLS/reverse proxy where required.
3. Create SIP extensions for 25 agents.
4. Configure carrier/SIP trunk and inbound/outbound routing.

## Phase 2: Dialer
1. Create users, campaigns, lists and lead import.
2. Configure predictive/progressive/manual dialing as required.
3. Configure dispositions and callbacks.
4. Enable call recording and recording access policy.

## Phase 3: CRM bridge
1. Map VICIdial user/lead/call IDs to CRM IDs.
2. Push call lifecycle events into CRM.
3. Open the existing Create Order workspace with the dialed/customer number.
4. Require disposition in the existing CRM workspace after call completion.
5. Store call outcome and recording metadata without replacing current CRM business logic.

## Phase 4: 25-seat pilot
1. Start with 2 test agents.
2. Test manual dialing, inbound, outbound, disposition, callback, order creation and recordings.
3. Expand to 5 agents, then 25 after stability checks.

## Change safety rule
No telephony/dialer work may overwrite or replace the protected CRM baseline. New integration code must be additive and isolated from existing working Create Order, Telephony, Customer 360 and Order Search code.
