## 2026-09-25 - ARIA Labels on Dynamically Populated Buttons
**Learning:** Found a button (`#clockInOutBtn`) that initially renders as an icon-only loading state before JS populates it with text. Even though it eventually gets text, the initial icon-only state requires an `aria-label` to ensure screen readers don't announce a blank or confusing element during the critical initial loading phase.
**Action:** Always check the *initial HTML* state of dynamic buttons, not just their final populated state, to ensure a11y compliance throughout the full component lifecycle.
