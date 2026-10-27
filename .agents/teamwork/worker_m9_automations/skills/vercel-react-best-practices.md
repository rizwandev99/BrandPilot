# Vercel React Best Practices Reference
Summarized for worker_m9_automations:
- Eliminate waterfalls: parallelize async operations where independent, start promises early.
- Bundle size: import directly, avoid unnecessary barrel bloat, clean dependencies.
- Rendering: proper keys, memoization where appropriate, avoid unnecessary re-renders.
