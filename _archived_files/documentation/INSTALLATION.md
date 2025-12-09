# 🚀 Sync System Installation Guide

## Required Dependencies

The sync system requires the following npm packages:

```bash
npm install idb axios ws
```

Or with yarn:

```bash
yarn add idb axios ws
```

Or with bun:

```bash
bun add idb axios ws
```

### Package Details

- **idb** (^7.1.1): IndexedDB wrapper with Promises
- **axios** (^1.6.0): HTTP client for API calls
- **ws** (^8.14.0): WebSocket library for real-time communication

## Installation Steps

### 1. Install Dependencies

```bash
cd /Users/mohamedahmed/Desktop/Desktop/MyWork/MYPOS/masr-pos-pro-mai
npm install idb axios ws
```

### 2. Install Type Definitions (TypeScript)

```bash
npm install --save-dev @types/ws
```

Note: `idb` and `axios` come with their own TypeScript definitions.

### 3. Verify Installation

After installation, verify that the packages are in `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "idb": "^7.1.1",
    "ws": "^8.14.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10"
  }
}
```

### 4. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
VITE_API_BASE_URL=http://localhost:3030
VITE_WS_URL=ws://localhost:3031
VITE_SYNC_INTERVAL=300000
VITE_AUTO_RESOLVE_CONFLICTS=server
```

### 5. Initialize in Your App

In `src/main.tsx` or `src/App.tsx`:

```tsx
import { SyncProvider } from "@/components/sync";

// Wrap your app with SyncProvider
<SyncProvider>
  <App />
</SyncProvider>;
```

### 6. Add Sync Status to UI (Optional)

In your header/navbar component:

```tsx
import { SyncStatusIndicator } from "@/components/sync";

function Header() {
  return (
    <header>
      <SyncStatusIndicator />
    </header>
  );
}
```

## Verification

### Check for Compilation Errors

```bash
npm run build
```

All TypeScript errors should be resolved after installing the dependencies.

### Test Sync System

1. Start your development server:

```bash
npm run dev
```

2. Open Developer Console
3. Check for sync initialization message:

```
✅ Sync system initialized successfully
```

## Troubleshooting

### Error: Cannot find module 'idb'

**Solution**: Install the package

```bash
npm install idb
```

### Error: Cannot find module 'axios'

**Solution**: Install the package

```bash
npm install axios
```

### Error: Cannot find module 'ws'

**Solution**: Install the package and types

```bash
npm install ws @types/ws
```

### TypeScript Errors After Installation

**Solution**: Restart your TypeScript server

- In VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- Or restart your dev server

### Module Resolution Issues

**Solution**: Check `tsconfig.json` has correct paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Optional: Run Tests

If you want to run the integration tests:

```bash
npm run test
```

## Next Steps

After successful installation:

1. ✅ Dependencies installed
2. ✅ Environment configured
3. ✅ App wrapped with SyncProvider
4. ✅ No compilation errors

You can now:

- Use `SyncableRepository` for auto-sync CRUD operations
- Add `SyncStatusIndicator` to your UI
- Handle conflicts with `useConflictResolution`
- Monitor sync events with `getSyncEngine()`

Refer to the [Usage Guide](./SYNC_SYSTEM_USAGE.md) for detailed usage instructions.
