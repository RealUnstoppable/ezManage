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
## 2024-06-09 - Alpine.js dynamic binding for accessibility attributes
**Learning:** When using Alpine.js (`x-data`, `x-show`), static aria attributes won't update when the state changes.
**Action:** Use Alpine's dynamic binding (`:aria-label="expanded ? 'Close' : 'Open'"`) to ensure screen readers get the current state description.
## 2026-06-06 - Form accessibility enhancements and malformed HTML
**Learning:** Malformed HTML blocks (like duplicated IDs and unclosed select tags) can co-exist alongside accessibility issues (missing `for` attributes). Duplicate IDs break JavaScript's `getElementById` and accessibility mapping simultaneously. Also, properly mapped labels increase the clickable hit area for inputs, significantly improving UX on mobile.
**Action:** When fixing accessibility mapping via explicit `for` attributes, always verify the surrounding HTML structure is not malformed, and ensure duplicate IDs are removed so the mapping correctly binds to the right element.

## 2024-06-05 - Form Accessibility Broken Tags
**Learning:** When addressing accessibility for form inputs (like adding explicit `for` attributes to labels), standard HTML validation can sometimes miss duplicated or malformed block structures in inline templates. This can cause the `for` attribute to map to duplicated `id` fields or break standard tab order.
**Action:** Always verify the surrounding HTML tags using strict parsing or manual verification before asserting that `for` to `id` mapping effectively improves accessibility, and fix underlying malformed HTML alongside accessibility improvements.
## 2024-05-18 - Missing Input Labels

**Learning:** Various input elements, especially form fields and selects across modals (like adding employees, shift notes, maintenance tickets), lack explicit `for` attribute linkages or `aria-label`s, which compromises accessibility. `id` and `for` linkages are preferred when visible text exists, while `aria-label` provides a fallback where a visible label is missing or less strictly associated.

**Action:** Consistently add `aria-label`s or correctly link `label` elements to their target `id` using the `for` attribute when introducing or modifying form fields.
## 2026-05-26 - [Diagnosing Global UI Breakages]
**Learning:** A single syntax error (like an unclosed brace) inside an inline HTML `<script>` block will halt execution of the entire script. This can cause unrelated features (like loading a Navbar or setting up event listeners) to completely fail, resulting in a broken UI.
**Action:** When diagnosing complete UI failures in Vanilla JS, check for syntax errors using strict parsers like Acorn on extracted script contents, as standard linters often ignore inline HTML scripts.

## 2024-07-03 - Icon-only buttons with partial text missing ARIA labels
**Learning:** Buttons that appear to have text but primarily rely on icons for their meaning (like "Add Manager" or "Invite" buttons with Lucide icons) can still benefit from explicit `aria-label`s, especially when they are dynamically rendered or placed in complex UI structures where standard screen readers might struggle to interpret the inline text content alongside the SVG/icon properly. Adding `aria-label` provides a robust, fail-safe announcement.
**Action:** Even if a button contains visible text, if its primary visual affordance is an icon (especially injected via `data-lucide`), consider adding an explicit `aria-label` to ensure unambiguous screen reader support, taking care not to unnecessarily duplicate information if the text is perfectly semantic.
## 2024-07-20 - Maintaining alignment in flex-row forms with new labels
**Learning:** When addressing accessibility for form inputs by adding a visible `<label>` above an `<input>` in a responsive flex-row form (e.g., in `company.html` Manager Administration), the added height of the label can misalign the adjacent action buttons.
**Action:** Use the Tailwind class `items-end` on the parent flex container to ensure the input field and adjacent action buttons remain horizontally aligned despite the new label's added height.
