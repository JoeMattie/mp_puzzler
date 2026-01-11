# Migrate from ESLint to Biome

> **Run after MVP implementation is complete**

**Goal:** Replace ESLint with Biome for faster linting and formatting.

---

## Task 1: Install and Configure Biome

**Step 1: Add Biome to root package.json**

```bash
npm install -D @biomejs/biome
```

**Step 2: Create biome.json in project root**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "off"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

**Step 3: Update package scripts**

In `packages/server/package.json` and `packages/client/package.json`:

```json
{
  "scripts": {
    "lint": "biome check src/",
    "format": "biome format src/ --write"
  }
}
```

**Step 4: Run format on entire codebase**

```bash
npm run format --workspaces
```

**Step 5: Run lint and fix any issues**

```bash
npm run lint --workspaces
```

**Step 6: Remove ESLint (if installed)**

```bash
npm uninstall eslint @eslint/* eslint-* --workspaces
rm .eslintrc* eslintrc* packages/*/.eslintrc* packages/*/eslintrc* 2>/dev/null || true
```

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: migrate from ESLint to Biome"
```
