# 🚀 Deployment Guide

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV_LOCAL[Local Development]
        DEV_SUPA[Supabase Local]
    end

    subgraph "Staging"
        STAGE_APP[Staging Build]
        STAGE_SUPA[Supabase Staging]
    end

    subgraph "Production"
        PROD_APP[Production Build]
        PROD_SUPA[Supabase Production]
        CDN[CDN / Updates Server]
    end

    subgraph "Distribution"
        WINDOWS[Windows Installer]
        MAC[macOS DMG]
        LINUX[Linux AppImage]
    end

    DEV_LOCAL --> STAGE_APP
    DEV_SUPA --> STAGE_SUPA

    STAGE_APP --> PROD_APP
    STAGE_SUPA --> PROD_SUPA

    PROD_APP --> WINDOWS
    PROD_APP --> MAC
    PROD_APP --> LINUX

    PROD_APP --> CDN
```

---

## Environment Setup

### Environment Variables

```mermaid
graph LR
    subgraph "Environment Files"
        ENV_DEV[.env.development]
        ENV_STAGE[.env.staging]
        ENV_PROD[.env.production]
    end

    subgraph "Variables"
        SUPA_URL[VITE_SUPABASE_URL]
        SUPA_KEY[VITE_SUPABASE_ANON_KEY]
        APP_ENV[VITE_APP_ENV]
        UPDATE_URL[VITE_UPDATE_URL]
    end
```

**.env.example:**

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx

# App
VITE_APP_ENV=development
VITE_APP_NAME=محلي POS
VITE_APP_VERSION=1.0.0

# Updates
VITE_UPDATE_URL=https://updates.example.com

# Features
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_LOGGING=true
```

---

## Supabase Setup

### Initial Setup Flow

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant CLI as Supabase CLI
    participant CLOUD as Supabase Cloud
    participant DB as Database

    DEV->>CLI: supabase init
    DEV->>CLI: supabase link --project-ref xxx

    DEV->>CLI: supabase db push
    CLI->>CLOUD: Apply migrations
    CLOUD->>DB: Create tables

    DEV->>CLI: supabase functions deploy
    CLI->>CLOUD: Deploy edge functions

    DEV->>CLI: supabase db seed
    CLI->>DB: Insert seed data
```

### Migration Strategy

```mermaid
graph TD
    subgraph "Migration Files"
        M1[00001_initial_schema.sql]
        M2[00002_rls_policies.sql]
        M3[00003_functions.sql]
        M4[00004_triggers.sql]
    end

    subgraph "Commands"
        CREATE[supabase migration new]
        PUSH[supabase db push]
        RESET[supabase db reset]
    end

    M1 --> M2 --> M3 --> M4
    CREATE --> PUSH
```

---

## Build Process

### Electron Build Flow

```mermaid
flowchart TD
    subgraph "Build Steps"
        INSTALL[npm install]
        LINT[npm run lint]
        TEST[npm run test]
        BUILD_WEB[npm run build]
        BUILD_ELECTRON[npm run electron:build]
    end

    subgraph "Outputs"
        WIN[Windows: .exe, .msi]
        MAC[macOS: .dmg, .pkg]
        LINUX[Linux: .AppImage, .deb]
    end

    INSTALL --> LINT --> TEST --> BUILD_WEB --> BUILD_ELECTRON
    BUILD_ELECTRON --> WIN
    BUILD_ELECTRON --> MAC
    BUILD_ELECTRON --> LINUX
```

### Build Configuration

**package.json build config:**

```json
{
  "build": {
    "appId": "com.mahali.pos",
    "productName": "محلي POS",
    "directories": {
      "output": "release"
    },
    "files": ["dist/**/*", "dist-electron/**/*"],
    "win": {
      "target": ["nsis", "msi"],
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": ["dmg", "pkg"],
      "icon": "public/icon.icns",
      "category": "public.app-category.business"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icon.png",
      "category": "Office"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "public/icon.ico",
      "uninstallerIcon": "public/icon.ico"
    },
    "publish": {
      "provider": "generic",
      "url": "https://updates.example.com"
    }
  }
}
```

---

## Auto-Update System

### Update Flow

```mermaid
sequenceDiagram
    participant APP as Application
    participant UPDATE as Update Server
    participant USER as User

    Note over APP,UPDATE: App starts

    APP->>UPDATE: Check for updates
    UPDATE-->>APP: Update available (v2.0.0)

    APP->>USER: "New update available"

    alt User accepts
        USER->>APP: Download update
        APP->>UPDATE: Download installer
        UPDATE-->>APP: Installer file
        APP->>APP: Verify signature
        APP->>USER: "Restart to update?"
        USER->>APP: Restart
        APP->>APP: Install & restart
    else User declines
        USER->>APP: Later
        Note over APP: Remind after grace period
    end
```

### Update Server Structure

```
updates.example.com/
├── latest.yml                 # Latest version info
├── latest-mac.yml
├── latest-linux.yml
├── releases/
│   ├── v1.0.0/
│   │   ├── محلي-POS-1.0.0-win.exe
│   │   ├── محلي-POS-1.0.0-mac.dmg
│   │   └── محلي-POS-1.0.0-linux.AppImage
│   └── v2.0.0/
│       ├── محلي-POS-2.0.0-win.exe
│       ├── محلي-POS-2.0.0-mac.dmg
│       └── محلي-POS-2.0.0-linux.AppImage
└── release-notes/
    ├── v1.0.0.md
    └── v2.0.0.md
```

**latest.yml example:**

```yaml
version: 2.0.0
releaseDate: 2025-12-15
releaseNotes: |
  ## What's New
  - Feature A
  - Feature B
  ## Bug Fixes
  - Fix X
  - Fix Y
mandatory: false
gracePeriodDays: 7
minSupportedVersion: 1.5.0
files:
  - url: releases/v2.0.0/محلي-POS-2.0.0-win.exe
    sha512: xxxxx
    size: 85000000
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```mermaid
flowchart TD
    subgraph "Trigger"
        PUSH[Push to main]
        TAG[New tag v*]
    end

    subgraph "Build Pipeline"
        CHECKOUT[Checkout code]
        SETUP[Setup Node.js]
        INSTALL[Install deps]
        LINT[Lint]
        TEST[Test]
        BUILD[Build]
    end

    subgraph "Package"
        WIN_BUILD[Build Windows]
        MAC_BUILD[Build macOS]
        LINUX_BUILD[Build Linux]
    end

    subgraph "Release"
        SIGN[Code signing]
        UPLOAD[Upload artifacts]
        RELEASE[Create release]
        NOTIFY[Notify users]
    end

    PUSH --> CHECKOUT
    TAG --> CHECKOUT
    CHECKOUT --> SETUP --> INSTALL --> LINT --> TEST --> BUILD
    BUILD --> WIN_BUILD & MAC_BUILD & LINUX_BUILD
    WIN_BUILD & MAC_BUILD & LINUX_BUILD --> SIGN --> UPLOAD --> RELEASE --> NOTIFY
```

**.github/workflows/release.yml:**

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Build Electron
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.os }}
          path: release/*

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: release-*/*
```

---

## Database Backup

### Backup Strategy

```mermaid
graph TB
    subgraph "Automatic Backups"
        DAILY[Daily Backup]
        WEEKLY[Weekly Backup]
        MONTHLY[Monthly Backup]
    end

    subgraph "Storage"
        S3[AWS S3 / Cloud Storage]
        RETENTION[Retention Policy]
    end

    subgraph "Recovery"
        PITR[Point-in-Time Recovery]
        RESTORE[Full Restore]
    end

    DAILY --> S3
    WEEKLY --> S3
    MONTHLY --> S3
    S3 --> RETENTION
    S3 --> PITR
    S3 --> RESTORE
```

**Retention Policy:**
| Backup Type | Retention |
|-------------|-----------|
| Daily | 7 days |
| Weekly | 4 weeks |
| Monthly | 12 months |

---

## Monitoring

### Monitoring Stack

```mermaid
graph TB
    subgraph "Application"
        APP[محلي POS]
        LOGS[Application Logs]
        ERRORS[Error Tracking]
    end

    subgraph "Supabase"
        DB_METRICS[Database Metrics]
        AUTH_LOGS[Auth Logs]
        FUNC_LOGS[Function Logs]
    end

    subgraph "Monitoring Services"
        SENTRY[Sentry - Errors]
        ANALYTICS[Analytics]
        UPTIME[Uptime Monitor]
    end

    APP --> LOGS --> SENTRY
    APP --> ERRORS --> SENTRY
    APP --> ANALYTICS

    DB_METRICS --> SENTRY
    AUTH_LOGS --> SENTRY
    FUNC_LOGS --> SENTRY

    APP --> UPTIME
```

### Health Checks

```mermaid
sequenceDiagram
    participant MONITOR as Monitor
    participant APP as App Server
    participant DB as Database
    participant FUNC as Edge Functions

    loop Every 5 minutes
        MONITOR->>APP: GET /health
        APP-->>MONITOR: 200 OK

        MONITOR->>DB: Check connection
        DB-->>MONITOR: Connected

        MONITOR->>FUNC: Invoke test function
        FUNC-->>MONITOR: 200 OK
    end

    alt Failure detected
        MONITOR->>ALERT: Send alert
        ALERT->>ADMIN: Email/SMS/Slack
    end
```

---

## Scaling Considerations

### Supabase Scaling

```mermaid
graph TB
    subgraph "Current: Free/Pro"
        FREE[Free Tier]
        PRO[Pro Tier]
    end

    subgraph "Growth"
        TEAM[Team Tier]
        ENTERPRISE[Enterprise]
    end

    subgraph "Optimization"
        INDEX[Optimize Indexes]
        CACHE[Implement Caching]
        CDN[Use CDN for Assets]
        EDGE[Edge Functions]
    end

    FREE --> PRO --> TEAM --> ENTERPRISE
    PRO --> INDEX & CACHE & CDN & EDGE
```

### Performance Targets

| Metric            | Target  |
| ----------------- | ------- |
| API Response Time | < 200ms |
| Sync Operation    | < 5s    |
| App Launch        | < 3s    |
| Invoice Creation  | < 500ms |

---

## Disaster Recovery

### Recovery Plan

```mermaid
flowchart TD
    subgraph "Detection"
        ALERT[Alert Triggered]
        ASSESS[Assess Impact]
    end

    subgraph "Response"
        ISOLATE[Isolate Issue]
        COMMUNICATE[Communicate to Users]
    end

    subgraph "Recovery"
        RESTORE_DB[Restore Database]
        DEPLOY_FIX[Deploy Fix]
        VERIFY[Verify Recovery]
    end

    subgraph "Post-Incident"
        REPORT[Incident Report]
        IMPROVE[Implement Improvements]
    end

    ALERT --> ASSESS --> ISOLATE --> COMMUNICATE
    COMMUNICATE --> RESTORE_DB --> DEPLOY_FIX --> VERIFY
    VERIFY --> REPORT --> IMPROVE
```

### RTO & RPO

| Scenario         | RTO     | RPO    |
| ---------------- | ------- | ------ |
| Database failure | 1 hour  | 1 hour |
| Application bug  | 30 min  | 0      |
| Full outage      | 4 hours | 1 hour |

---

## Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Environment variables set
- [ ] Database migrations tested
- [ ] Backup verified

### Deployment

- [ ] Build successful
- [ ] Artifacts signed
- [ ] Update server configured
- [ ] Release notes written

### Post-Deployment

- [ ] Health checks passing
- [ ] Monitoring active
- [ ] User notifications sent
- [ ] Documentation updated
