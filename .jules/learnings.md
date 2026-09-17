## 2026-06-15 - Jest ESM SyntaxError '.default' resolution
**Learning:** When Jest throws `SyntaxError: Identifier '.default' has already been declared` in a  frontend project running `--experimental-vm-modules`, it indicates Babel is misconfigured or attempting to transpile ESM imports inappropriately for the test environment.
**Action:** Ensure the babel config is named `babel.config.cjs` to be properly parsed by Jest, and execute tests directly with `NODE_OPTIONS='--experimental-vm-modules'` set.
## 2025-02-23 - Jest ESM SyntaxError '.default' resolution
**Learning:** When Jest throws `SyntaxError: Identifier '.default' has already been declared` in a `"type": "module"` frontend project running `--experimental-vm-modules`, it indicates Babel is misconfigured or attempting to transpile ESM imports inappropriately for the test environment.
**Action:** Ensure the babel config is named `babel.config.cjs` to be properly parsed by Jest, and execute tests directly with `NODE_OPTIONS='--experimental-vm-modules'` set.
