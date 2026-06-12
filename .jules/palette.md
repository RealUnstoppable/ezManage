## 2023-10-27 - Icon-only buttons lacking ARIA labels
**Learning:** Icon-only buttons (like those using Lucide icons) often rely only on `title` attributes, which are inconsistently announced by screen readers. For example, the Import and Export JSON buttons in the tracker header.
**Action:** Always add explicit `aria-label` attributes to icon-only interactive elements to ensure reliable accessibility announcements, especially when no visible text is present.
## 2024-05-24 - Form accessibility enhancements
**Learning:** Adding correct explicit `for` attributes to decoupled `<label>` elements mapped to `<input>` IDs significantly improves screen reader navigation and mouse hit targets in ezManage's Auth, Setup, and Tracker forms. Also learned that adding explicit `for` attributes to labels that already wrap their target input is redundant. Adding `aria-live` to rapidly updating timers should be avoided.
**Action:** Next time, only apply `for` mapping to non-wrapping labels. When linking descriptive text to buttons, use `aria-describedby` instead of `aria-labelledby` if the intention is to append description rather than overriding the button's visible text. Avoid using `aria-live` for continuously polling elements like stopwatches, as it overwhelms the user.

## 2024-05-02 - ARIA labels for dynamic inputs and icon-only buttons
**Learning:** Icon-only action buttons (like Import/Export JSON) and dynamically generated form inputs (like dynamically added drawer or inventory rows) often lack implicit labels that screen readers rely on. Providing `aria-label` attributes for these dynamic inputs ensures the accessibility tree correctly associates the generated controls with their contextual purpose (e.g., "Drawer Amount", "Freezer Count").
**Action:** Always ensure that dynamically injected `<input>` elements have either an explicit wrapping `<label>`, an explicit `for` associated `<label>`, or an `aria-label` attribute if screen space prohibits a visible label, so screen reader users understand the input's purpose.

## 2024-05-24 - Async Button Loading States
**Learning:** Using generic textual changes like "Wait..." on submission buttons often feels disjointed. Adding a combination of `disabled` Tailwind utility classes (`disabled:opacity-70 disabled:cursor-not-allowed`) alongside an animated icon (like Lucide's `loader-2` with `animate-spin`) provides superior visual feedback. It prevents duplicate form submissions and clarifies system state immediately.
**Action:** Always implement explicit loading and disabled states for asynchronous actions like form submissions, keeping original button text preserved for post-request restoration.

## 2024-05-24 - Lucide Icon Injection & Async Loading States
**Learning:** When injecting `<i data-lucide="...">` icons dynamically into the DOM (such as appending a `loader-2` spinner during an async form submission), the icons will not render until `lucide.createIcons()` is explicitly called.
**Action:** Always call `lucide.createIcons()` immediately after any `innerHTML` assignment or DOM manipulation that introduces new Lucide icons to ensure visual parity.

## 2024-05-24 - Form accessibility enhancements on User Profile
**Learning:** Placeholder attributes in text inputs (e.g., in the Personal Details section of user profiles) do not serve as an accessible replacement for proper labels. Screen readers may ignore them, leaving users without context on what the inputs represent.
**Action:** Always wrap inputs in a container and provide a visible, explicitly mapped `<label>` element using the `for` attribute that points to the `<input>` `id`. This ensures both visual clarity and proper screen reader announcements.
## 2024-05-21 - Icon-only buttons in template literals missing aria-labels
**Learning:** When generating HTML dynamically via template literals (e.g., iterating through items in `company.html`), icon-only buttons (like remove buttons using Lucide icons) are frequently missing `aria-label` attributes because standard linting doesn't catch them in JS template strings. This significantly impacts screen reader accessibility for dynamic lists.
**Action:** When reviewing dynamic list generation (like onboarding roles or manager lists), explicitly verify that any action buttons containing only icons include an appropriate `aria-label`.
## 2024-05-24 - ARIA labels for placeholder-only inputs
**Learning:** Inputs that rely solely on `placeholder` attributes without an explicit `<label>` element or an `aria-label` are inaccessible to screen readers. For example, dynamically generated inputs or those in tight UI spaces like `customPresetName` or `featureReqText`.
**Action:** Always provide an explicit `aria-label` attribute on form inputs if screen space prohibits a visible `<label>` to ensure the input’s purpose is clearly announced.
## 2024-05-24 - ARIA labels for dynamic inputs and textareas lacking visible labels
**Learning:** Inputs (`<input>`) and textareas (`<textarea>`) that lack a visible `<label>` but use a `placeholder` attribute are inaccessible for screen readers. This applies to UI components like `newRoutineTask`, `customPresetName`, `featureReqText`, and `shiftNoteContent` in `index.html`. Placeholders do not replace explicit labels.
**Action:** Always provide an explicit `aria-label` attribute on form inputs and textareas if screen space prohibits a visible `<label>`. This ensures the purpose of the input is clearly communicated to screen reader users.
## 2026-06-12 - ARIA labels for dynamic inputs and textareas lacking visible labels
**Learning:** Inputs (`<input>`) and textareas (`<textarea>`) that lack a visible `<label>` but use a `placeholder` attribute are inaccessible for screen readers. This applies to UI components like `newRoutineTask`, `customPresetName`, `featureReqText`, and `shiftNoteContent` in `index.html`. Placeholders do not replace explicit labels.
**Action:** Always provide an explicit `aria-label` attribute on form inputs and textareas if screen space prohibits a visible `<label>`. This ensures the purpose of the input is clearly communicated to screen reader users.

## 2026-06-12 - Form accessibility enhancements
**Learning:** Adding correct explicit `for` attributes to decoupled `<label>` elements mapped to `<input>` or `<select>` IDs significantly improves screen reader navigation and mouse hit targets in ezManage's Schedule and Time Off forms.
**Action:** Next time, always ensure that decoupled `<label>` elements have an explicit `for` attribute pointing to their respective `<input>` or `<select>` ID. Do not rely merely on proximity or visually surrounding elements.
