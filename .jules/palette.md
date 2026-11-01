## 2024-03-24 - Accessibility improvements
**Learning:** Dynamically injected icon-only buttons via JavaScript often bypass standard linter checks for missing `aria-label` attributes.
**Action:** When injecting Lucide icons dynamically into the DOM using template literals, explicitly include an `aria-label` on the wrapping button element and ensure `lucide.createIcons()` is called.
