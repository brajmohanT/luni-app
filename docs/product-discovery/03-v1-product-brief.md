# Luni: V1 direction

Agreed: 2026-09-21

Luni is a warm daily companion for adults aged 18–30. It listens, remembers relevant context, and helps with small practical needs. Initial testers: college students and early-career professionals.

## Core scenarios

- Talk through a difficult day and feel heard before receiving advice.
- Find company during free time. We still need to validate this reason to return.
- Request a timed reminder and receive a server-triggered push notification.

## Scope

| V1 | V2 or later |
| --- | --- |
| One central companion, text-only | Voice |
| One continuous conversation | 2–4 custom fictional or relationship personas |
| Adjustable warmth and conversational style | Affectionate romantic roleplay through separate personas |
| Memory of relevant context | Permission-based memory sharing from the central companion to personas; no sharing back |
| User-requested reminders | Optional persona invitation after sustained user-initiated flirting, once personas exist |

The central companion stays mostly affectionate. It may respond with very light flirting but does not initiate it or adopt a romantic-partner role. 

Explicit sexual conversation is outside the initial persona scope. 

## Future actions inside chat

Agreed: 2026-09-21. Reminders are the first action users can request inside chat. Future scope includes calling a contact, sending email, saving notes within Luni itself, and other mobile actions. These additions are outside v1; 

Use a shared action-card structure with action-specific details, status, and controls:

- Details: the task, recipient, content, or scheduled time, as applicable.
- Status: needs confirmation, completed, or failed, with action-specific states such as a saved reminder.
- Controls: edit, confirm, cancel, or retry, as applicable.

Design the v1 reminder card for reuse across these future actions.

## Open decisions

- Memory-saving rules and user controls.
- Reminder management and proactive check-ins.
- Free usage limits, pricing, and whether subscriptions launch in v1. “50 messages/hour, then wait two hours” was an example, not a decision.

## What V1 must test

Do users feel heard, return by choice, and find memory and reminders useful? Will they value Luni alongside ChatGPT or Gemini? Paid demand remains unvalidated.
