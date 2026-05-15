## 2024-05-24 - Form accessibility enhancements
**Learning:** Adding correct explicit `for` attributes to decoupled `<label>` elements mapped to `<input>` IDs significantly improves screen reader navigation and mouse hit targets in ezManage's Auth, Setup, and Tracker forms. Also learned that adding explicit `for` attributes to labels that already wrap their target input is redundant. Adding `aria-live` to rapidly updating timers should be avoided.
**Action:** Next time, only apply `for` mapping to non-wrapping labels. When linking descriptive text to buttons, use `aria-describedby` instead of `aria-labelledby` if the intention is to append description rather than overriding the button's visible text. Avoid using `aria-live` for continuously polling elements like stopwatches, as it overwhelms the user.

## 2024-05-02 - ARIA labels for dynamic inputs and icon-only buttons
**Learning:** Icon-only action buttons (like Import/Export JSON) and dynamically generated form inputs (like dynamically added drawer or inventory rows) often lack implicit labels that screen readers rely on. Providing `aria-label` attributes for these dynamic inputs ensures the accessibility tree correctly associates the generated controls with their contextual purpose (e.g., "Drawer Amount", "Freezer Count").
**Action:** Always ensure that dynamically injected `<input>` elements have either an explicit wrapping `<label>`, an explicit `for` associated `<label>`, or an `aria-label` attribute if screen space prohibits a visible label, so screen reader users understand the input's purpose.

## 2024-05-24 - Async Button Loading States
**Learning:** Using generic textual changes like "Wait..." on submission buttons often feels disjointed. Adding a combination of `disabled` Tailwind utility classes (`disabled:opacity-70 disabled:cursor-not-allowed`) alongside an animated icon (like Lucide's `loader-2` with `animate-spin`) provides superior visual feedback. It prevents duplicate form submissions and clarifies system state immediately.
**Action:** Always implement explicit loading and disabled states for asynchronous actions like form submissions, keeping original button text preserved for post-request restoration.

## 2024-05-24 - Playwright visual verification of hidden elements
**Learning:** When using Playwright to verify UI components like the Shift Tracker in `index.html`, elements may initially be hidden by `display: none` on the `<body>` (used to prevent FOUC during auth checks) or within hidden tabs.
**Action:** Use `page.evaluate("document.body.style.display = 'block'; window.navTo('tracker');")` to bypass auth and render the target UI. Use `.wait_for(state="attached")` instead of `state="visible"` for elements that are in the DOM but may be scrolled out of view or temporarily obscured, then scroll them into view using `scrollIntoView()` before taking a screenshot.
