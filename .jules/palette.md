## 2023-10-27 - Icon-only buttons lacking ARIA labels
**Learning:** Icon-only buttons (like those using Lucide icons) often rely only on `title` attributes, which are inconsistently announced by screen readers. For example, the Import and Export JSON buttons in the tracker header.
**Action:** Always add explicit `aria-label` attributes to icon-only interactive elements to ensure reliable accessibility announcements, especially when no visible text is present.
