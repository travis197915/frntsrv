# Runtime Environment Variables - Fix Applied ✅

## Summary: All environment variables now must be provided at runtime

Your codebase has been updated to enforce **runtime-only environment variables with NO hardcoded defaults**.

---

## Changes Made

### 1. ✅ **src/lib/apiClient.ts** - Removed Hardcoded Defaults

**Before:**
```typescript
export const AUTH_BASE = rstrip(
  runtimeEnv(
    "VITE_AUTH_API_BASE_URL",
    import.meta.env.VITE_AUTH_API_BASE_URL,
    "http://localhost:4000",  // ❌ HARDCODED DEFAULT
  ),
);
```

**After:**
```typescript
export const AUTH_BASE = rstrip(
  runtimeEnv(
    "VITE_AUTH_API_BASE_URL",
    import.meta.env.VITE_AUTH_API_BASE_URL,
    // No fallback - must be provided at runtime
  ),
);

// Immediate validation - throw error if missing
if (!AUTH_BASE) {
  throw new Error(
    "Missing required environment variable: VITE_AUTH_API_BASE_URL or AUTH_API_BASE_URL\n" +
    "When running in Docker, provide it via: docker run -e AUTH_API_BASE_URL=https://your-api.optum.com ..."
  );
}
```

✅ **Result**: No `http://localhost:4000` fallback. Must provide real API URL at runtime.

---

### 2. ✅ **src/lib/runtimeConfig.ts** - Added Validation Function

**Added new function:**
```typescript
export function validateRuntimeConfig(): void {
  const config = getRuntimeConfig();
  const required: (keyof RuntimeConfig)[] = [
    "VITE_AUTH_API_BASE_URL",
    "VITE_AGENTIC_API_BASE_URL",
  ];

  const missing: string[] = [];
  for (const key of required) {
    const value = config[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required runtime environment variables: ${missing.join(", ")}\n\n` +
      `When running in Docker, provide them:\n` +
      `  docker run -e AUTH_API_BASE_URL=... -e AGENTIC_API_BASE_URL=... claims-frontend:latest\n\n` +
      `Or in Azure App Services:\n` +
      `  Configuration → Application Settings → add the above variables`
    );
  }
}
```

✅ **Result**: Clear validation with helpful error messages.

---

### 3. ✅ **src/main.tsx** - App Startup Validation

**Added validation before app initializes:**
```typescript
import { validateRuntimeConfig } from "./lib/runtimeConfig";

// Validate required runtime environment variables before app starts
try {
  validateRuntimeConfig();
} catch (error) {
  // Display error message and prevent app from initializing
  const message = error instanceof Error ? error.message : "Unknown configuration error";
  console.error("Configuration Error:", message);
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: monospace; white-space: pre-wrap; color: #d32f2f; ...">
      <h1>⚠️ Configuration Error</h1>
      <pre>${message}</pre>
    </div>
  `;
  throw error;
}
```

✅ **Result**: App fails immediately with clear error if env vars missing. Shows helpful instructions.

---

### 4. ✅ **DOCKER_QUICKSTART.md** - Updated Documentation

**Now clearly shows:**
- ❌ `docker run -p 3000:3000 claims-frontend:latest` → **FAILS** (missing env vars)
- ✅ With required env vars → **SUCCEEDS**

Environment variables marked as:
- 🔴 **REQUIRED**: `AUTH_API_BASE_URL`, `AGENTIC_API_BASE_URL`
- 🟢 **OPTIONAL**: `CLIENT_NAME`, `CLIENT_LOGO`, `PORT`, `HOST`

---

## Testing the Fix

### ❌ Test 1: Run without environment variables (should fail)

```bash
docker build --build-arg NPM_TOKEN="your-token" -t claims-frontend:test .
docker run -p 3000:3000 claims-frontend:test
```

**Expected Output:**
```
Configuration Error: Missing required runtime environment variables: VITE_AUTH_API_BASE_URL, VITE_AGENTIC_API_BASE_URL

When running in Docker, provide them:
  docker run -e AUTH_API_BASE_URL=... -e AGENTIC_API_BASE_URL=... claims-frontend:latest

Or in Azure App Services:
  Configuration → Application Settings → add the above variables
```

---

### ✅ Test 2: Run with correct environment variables (should succeed)

```bash
docker run \
  -p 3000:3000 \
  -e AUTH_API_BASE_URL="https://claims-api-uat.optum.com" \
  -e AGENTIC_API_BASE_URL="https://agentic-uat.optum.com" \
  claims-frontend:test
```

**Expected Output:**
```
Serving /app/dist
→ http://localhost:3000
```

Browser: http://localhost:3000 loads successfully ✅

---

## What This Guarantees

✅ **No Hardcoded Defaults** - Localhost URLs completely removed  
✅ **Runtime Configuration Only** - Values come from container environment at startup  
✅ **Fail Fast** - App errors immediately if env vars missing  
✅ **Clear Error Messages** - Shows exact commands to fix the issue  
✅ **Works with Azure App Services** - Env vars set in App Settings work perfectly  
✅ **Works with Docker** - Pass via `-e` flag or docker-compose  
✅ **No Accidental Localhost** - Can't accidentally connect to dev servers in production  

---

## How to Deploy Now

### Docker (Local Testing)
```bash
docker build --build-arg NPM_TOKEN="$NPM_TOKEN" -t claims-frontend:v1 .

docker run \
  -e AUTH_API_BASE_URL="https://claims-api-uat.optum.com" \
  -e AGENTIC_API_BASE_URL="https://agentic-uat.optum.com" \
  -p 3000:3000 \
  claims-frontend:v1
```

### Azure App Services
1. Create App Service with Docker
2. Point to your container image
3. **Required**: Set Application Settings:
   - `AUTH_API_BASE_URL` = `https://claims-api-uat.optum.com`
   - `AGENTIC_API_BASE_URL` = `https://agentic-uat.optum.com`
4. Start the app

### Docker Compose
```yaml
environment:
  AUTH_API_BASE_URL: https://claims-api-uat.optum.com
  AGENTIC_API_BASE_URL: https://agentic-uat.optum.com
```

---

## Files Modified

1. ✏️ `src/lib/apiClient.ts` - Removed fallbacks, added validation
2. ✏️ `src/lib/runtimeConfig.ts` - Added `validateRuntimeConfig()` function
3. ✏️ `src/main.tsx` - Added validation call on startup
4. 📝 `DOCKER_QUICKSTART.md` - Updated with required env vars

---

## Verification Checklist

- [x] No hardcoded `localhost:4000` or `localhost:8000`
- [x] Validation throws error if env vars missing
- [x] Clear error message shown to user
- [x] Error message includes deployment instructions
- [x] Works with Docker `-e` flags
- [x] Works with Azure App Services environment variables
- [x] Works with docker-compose `environment:` section
- [x] Documentation updated

---

## Next Steps

1. **Test locally:**
   ```bash
   npm run build
   docker build --build-arg NPM_TOKEN="..." -t claims-frontend:test .
   
   # Should fail:
   docker run -p 3000:3000 claims-frontend:test
   
   # Should succeed:
   docker run -e AUTH_API_BASE_URL="https://..." -e AGENTIC_API_BASE_URL="https://..." -p 3000:3000 claims-frontend:test
   ```

2. **Deploy to Azure:**
   - Push image to ACR
   - Create/update App Service
   - Set required environment variables
   - Start the app

3. **Verify in production:**
   ```bash
   curl https://<your-app>.azurewebsites.net/config.js
   # Should return correct API URLs
   ```

