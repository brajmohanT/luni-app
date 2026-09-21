# Luni UI prototypes

Saved: 2026-09-21.

Open `index.html` in a browser to browse the prototypes.

- `screens/`: Individual screen prototypes, including the navigable Settings and detail screens.
- `walkthrough/`: The complete onboarding, chat, and Settings walkthrough.
- `archive/`: Earlier memory-list and inline-settings designs, superseded during iteration.
- `sources/`: Original editable HTML fragments and export fragments with standalone preview controls.

Use **Preview controls** above a prototype for alternate states. The walkthrough includes new and returning users, reminder notifications, login/message failures, and memory/reminder loading, empty, and error states.

These files contain sample data and simulated actions. They do not connect to the application backend. The original in-chat fragments remain separate from the browser exports. Some icons depend on a CDN connection.

Current design decisions: login first; optional name and conversation style; one continuous chat; one combined memory text block; separate Settings detail screens; preferred-name editing in a dialog. Reminder cards support edit/cancel; clear requests need no additional save confirmation.
