// Canonical geometry for the Luni connection mark.
// The two upper forms represent presence and openness; the lower gesture
// connects them without drawing a second literal body.
export const luniLogo = {
  viewBox: '0 0 800 800',
  fill: '#FFFFFF',
  head: { cx: 288, cy: 190, r: 92 },
  presence: { cx: 552, cy: 178, r: 78, strokeWidth: 28 },
  connection: {
    d: 'M 110 662 C 110 485 164 385 292 369 C 404 355 583 380 690 346',
    strokeWidth: 104,
  },
} as const;
