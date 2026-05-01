# 🔒 Security Implementation Guide

## Overview

This guide documents the security improvements implemented in MediaSoft POS to address critical vulnerabilities and enhance overall system security.

## ✅ Implemented Security Features

### 1. Password Hashing Migration (SHA1 → Bcrypt)

**Files Created/Modified:**
- `src/backend/services/crypto.ts` - Enhanced with bcrypt support
- `src/backend/models/PenggunaModel.ts` - Added migration methods
- `src/backend/controllers/AuthController.ts` - Complete rewrite with security
- `src/database/schema.ts` - Added `password_hash_type` column
- `MIGRATION_PASSWORD_HASH_TYPE.sql` - Database migration script

**Features:**
- ✅ Bcrypt hashing with cost factor 12
- ✅ Backward compatibility with SHA1
- ✅ Automatic migration on successful login
- ✅ Password strength validation
- ✅ Migration status tracking

**How It Works:**
1. Existing users have `password_hash_type = 'sha1'`
2. On login, system verifies with SHA1
3. If valid, immediately migrates to bcrypt
4. New users automatically use bcrypt
5. Activity log tracks all migrations

**Usage:**
```typescript
// Login automatically handles migration
const result = await AuthController.login(username, password, ipAddress)

// Check migration status
const status = AuthController.getMigrationStatus()
// Returns: { total, migrated, pending, percentage }
```

### 2. Rate Limiting (Brute Force Protection)

**Files Created:**
- `src/backend/services/rateLimiter.ts`

**Features:**
- ✅ 5 failed attempts allowed
- ✅ 15-minute lockout after max attempts
- ✅ 5-minute attempt window
- ✅ Automatic cleanup of old attempts
- ✅ Remaining attempts counter

**How It Works:**
1. Tracks failed login attempts per username
2. After 5 failed attempts in 5 minutes → lock for 15 minutes
3. Successful login resets counter
4. Automatic cleanup every 10 minutes

**Usage:**
```typescript
// Check if user is locked
const lockStatus = rateLimiter.isLocked(username)
if (lockStatus.locked) {
  // Show remaining time
  console.log(`Locked for ${lockStatus.remainingTime} seconds`)
}

// Record failed attempt
const result = rateLimiter.recordFailedAttempt(username)
console.log(`Remaining attempts: ${result.remainingAttempts}`)

// Reset on successful login
rateLimiter.resetAttempts(username)
```

### 3. Session Management

**Files Created:**
- `src/backend/services/sessionManager.ts`

**Features:**
- ✅ 30-minute inactivity timeout
- ✅ Session validation
- ✅ Activity tracking
- ✅ Warning before timeout (29 minutes)
- ✅ Multi-session support per user
- ✅ Automatic cleanup

**How It Works:**
1. Create session on login
2. Update activity on each action
3. Validate session before operations
4. Warn user 1 minute before timeout
5. Auto-logout after 30 minutes inactivity

**Usage:**
```typescript
// Create session
const sessionId = sessionManager.createSession(username, role)

// Update activity
sessionManager.updateActivity(sessionId)

// Validate session
const validation = sessionManager.validateSession(sessionId)
if (!validation.valid) {
  // Session expired - redirect to login
}
if (validation.shouldWarn) {
  // Show warning: "Session expires in X seconds"
}

// Logout
sessionManager.destroySession(sessionId)
```

### 4. Input Sanitization

**Files Created:**
- `src/backend/services/sanitizer.ts`

**Features:**
- ✅ HTML tag removal
- ✅ Script tag removal
- ✅ XSS prevention
- ✅ SQL injection prevention
- ✅ Email validation
- ✅ Phone validation
- ✅ Number validation
- ✅ Password strength validation
- ✅ File upload validation
- ✅ Filename sanitization
- ✅ Length validation

**Usage:**
```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  validatePasswordStrength,
  validateFileUpload,
  sanitizeObject,
} from '../services/sanitizer.js'

// Sanitize string (prevent XSS)
const safe = sanitizeString(userInput)

// Validate email
const { valid, email } = sanitizeEmail(emailInput)

// Validate phone
const { valid, phone } = sanitizePhone(phoneInput)

// Validate number
const { valid, number } = sanitizeNumber(priceInput)

// Validate password
const validation = validatePasswordStrength(password)
if (!validation.valid) {
  console.log(validation.message)
}

// Validate file upload
const fileValidation = validateFileUpload(
  filename,
  fileSize,
  ['.jpg', '.png', '.pdf'],
  5 * 1024 * 1024 // 5MB
)

// Sanitize entire object
const sanitized = sanitizeObject(formData)
```

### 5. Centralized Error Handling

**Files Created:**
- `src/backend/services/errorHandler.ts`
- `src/renderer/components/ErrorBoundary.tsx`

**Features:**
- ✅ Error categorization (INFO, WARNING, ERROR, CRITICAL)
- ✅ Structured logging to files
- ✅ User-friendly error messages
- ✅ Retry mechanism with exponential backoff
- ✅ Sensitive data redaction
- ✅ Critical error notifications
- ✅ 30-day log retention
- ✅ React Error Boundary for frontend

**Backend Usage:**
```typescript
import { errorHandler, ErrorSeverity, withErrorHandling } from '../services/errorHandler.js'

// Log error
errorHandler.log(
  new Error('Database connection failed'),
  ErrorSeverity.ERROR,
  'DATABASE',
  username,
  { query: 'SELECT * FROM users' }
)

// Retry with exponential backoff
const result = await errorHandler.withRetry(async () => {
  return await database.query('SELECT * FROM users')
}, 3, 1000)

// Get user-friendly message
const message = errorHandler.getUserFriendlyMessage(error)

// Wrap function with error handling
const safeFunction = withErrorHandling(
  async (id: string) => {
    return await database.getUser(id)
  },
  'USER_MODULE',
  username
)
```

**Frontend Usage:**
```tsx
import { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary'

// Wrap entire app
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Wrap specific component
const SafeComponent = withErrorBoundary(MyComponent)

// Custom fallback
<ErrorBoundary fallback={<CustomErrorPage />}>
  <MyComponent />
</ErrorBoundary>
```

### 6. AES-256 Data Encryption

**Files Modified:**
- `src/backend/services/crypto.ts`

**Features:**
- ✅ AES-256-CBC encryption
- ✅ Random IV generation
- ✅ Scrypt key derivation

**Usage:**
```typescript
import { encryptData, decryptData } from '../services/crypto.js'

// Encrypt sensitive data
const encrypted = encryptData('sensitive data', 'encryption-key')

// Decrypt data
const decrypted = decryptData(encrypted, 'encryption-key')
```

## 🔄 Migration Steps

### Step 1: Run Database Migration

```bash
sqlite3 sistem_pos.db < MIGRATION_PASSWORD_HASH_TYPE.sql
```

This adds the `password_hash_type` column to the `mediasoft_pengguna` table.

### Step 2: Update IPC Handlers

Add new IPC handlers in `src/main/ipcHandlers.ts`:

```typescript
// Auth handlers with IP address
ipcMain.handle('auth:login', async (event, username, password) => {
  // Get IP address from renderer (if needed)
  return await AuthController.login(username, password, '127.0.0.1')
})

ipcMain.handle('auth:logout', async (event, username) => {
  return AuthController.logout(username, '127.0.0.1')
})

ipcMain.handle('auth:change-password', async (event, username, oldPassword, newPassword) => {
  return await AuthController.changePassword(username, oldPassword, newPassword, '127.0.0.1')
})

ipcMain.handle('auth:migration-status', async () => {
  return AuthController.getMigrationStatus()
})

// Error logging
ipcMain.handle('log-error', async (event, errorData) => {
  errorHandler.log(
    new Error(errorData.message),
    ErrorSeverity.ERROR,
    'RENDERER',
    undefined,
    errorData
  )
  return { success: true }
})
```

### Step 3: Update Frontend Login

Update `src/renderer/pages/Login.tsx` to show remaining attempts:

```tsx
const handleLogin = async () => {
  const result = await window.api.invoke('auth:login', username, password)
  
  if (!result.success) {
    // Show error with remaining attempts if available
    toast.error(result.message)
  } else {
    // Login successful
    navigate('/dashboard')
  }
}
```

### Step 4: Wrap App with Error Boundary

Update `src/renderer/main.tsx`:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary'

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
```

### Step 5: Add Session Management to Frontend

Create `src/renderer/hooks/useSession.ts`:

```tsx
import { useEffect, useState } from 'react'

export function useSession() {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  useEffect(() => {
    // Update activity on user interaction
    const updateActivity = () => {
      window.api.invoke('session:update-activity')
    }

    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('click', updateActivity)

    // Check session every minute
    const interval = setInterval(async () => {
      const result = await window.api.invoke('session:validate')
      
      if (!result.valid) {
        // Session expired - logout
        window.location.href = '/login?reason=timeout'
      } else if (result.shouldWarn) {
        setShowWarning(true)
        setRemainingTime(result.remainingTime)
      }
    }, 60000)

    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('click', updateActivity)
      clearInterval(interval)
    }
  }, [])

  return { showWarning, remainingTime }
}
```

## 📊 Security Checklist

### ✅ Completed
- [x] Bcrypt password hashing
- [x] SHA1 to bcrypt migration
- [x] Rate limiting (brute force protection)
- [x] Session management with timeout
- [x] Input sanitization
- [x] XSS prevention
- [x] SQL injection prevention
- [x] Password strength validation
- [x] Centralized error handling
- [x] React Error Boundary
- [x] Structured logging
- [x] Sensitive data redaction
- [x] AES-256 encryption

### ⏳ Pending
- [ ] HTTPS/TLS for network communication
- [ ] Content Security Policy (CSP)
- [ ] CSRF protection
- [ ] API rate limiting
- [ ] IP whitelisting
- [ ] Two-factor authentication (2FA)
- [ ] Security audit logging
- [ ] Penetration testing
- [ ] Security headers
- [ ] Database encryption at rest

## 🔐 Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Recommended: Special characters for strong passwords

### Session Security
- 30-minute inactivity timeout
- Warning 1 minute before timeout
- Automatic cleanup of expired sessions
- Session validation on every request

### Input Validation
- Always sanitize user input
- Validate data types and formats
- Check input length limits
- Remove HTML and script tags
- Use parameterized queries

### Error Handling
- Never expose sensitive information in errors
- Log all errors with context
- Show user-friendly messages
- Create notifications for critical errors
- Implement retry mechanisms

### Logging
- Log all authentication attempts
- Log all authorization failures
- Log all data modifications
- Redact sensitive information
- Retain logs for 30 days

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

## 🆘 Support

For security issues or questions:
1. Check this documentation
2. Review error logs in `logs/` directory
3. Check activity logs in database
4. Contact security team

---

**Last Updated:** 2026-04-28
**Version:** 1.0.0
**Status:** ✅ Phase 1 Complete
