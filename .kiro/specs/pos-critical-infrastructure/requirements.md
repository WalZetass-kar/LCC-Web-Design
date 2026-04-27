# Requirements: POS Critical Infrastructure Improvements

## 1. Overview

### 1.1 Feature Summary
Implementasi infrastruktur kritis untuk MediaSoft POS yang mencakup testing framework, security improvements, dan error handling system. Ini adalah **Phase 1** dari 7 improvement yang direncanakan, fokus pada fondasi yang solid sebelum menambahkan fitur-fitur lainnya.

### 1.2 Business Value
- **Security**: Melindungi data user dan transaksi dari vulnerability
- **Reliability**: Mengurangi bugs dan crashes melalui comprehensive testing
- **Maintainability**: Memudahkan development dan debugging dengan proper error handling
- **Trust**: Meningkatkan kepercayaan user dengan aplikasi yang stabil dan aman

### 1.3 Target Users
- **Developers**: Testing framework dan error handling untuk development
- **End Users**: Security improvements dan better error messages
- **System Administrators**: Logging dan monitoring capabilities

---

## 2. User Stories

### 2.1 Testing Infrastructure

#### US-1.1: Developer dapat menjalankan unit tests
**As a** developer  
**I want to** run unit tests for backend controllers and models  
**So that** I can verify business logic works correctly

**Acceptance Criteria:**
- [ ] Vitest configured dengan TypeScript support
- [ ] Test utilities dan helpers tersedia
- [ ] Dapat run tests dengan `npm test`
- [ ] Test coverage report generated
- [ ] All existing controllers have unit tests
- [ ] All existing models have unit tests

#### US-1.2: Developer dapat menjalankan integration tests
**As a** developer  
**I want to** run integration tests for IPC handlers  
**So that** I can verify frontend-backend communication works

**Acceptance Criteria:**
- [ ] IPC handlers dapat di-test secara isolated
- [ ] Mock electron APIs tersedia
- [ ] Test coverage untuk critical IPC handlers >80%
- [ ] Tests run dalam CI/CD pipeline

#### US-1.3: Developer dapat menjalankan component tests
**As a** developer  
**I want to** test React components  
**So that** I can ensure UI behaves correctly

**Acceptance Criteria:**
- [ ] React Testing Library configured
- [ ] Can test components with user interactions
- [ ] Can test components with context (Auth, Toast, Theme)
- [ ] Critical components (Button, Modal, DataTable) have tests

#### US-1.4: Developer dapat menjalankan E2E tests
**As a** developer  
**I want to** run end-to-end tests for critical flows  
**So that** I can verify the entire application works

**Acceptance Criteria:**
- [ ] E2E testing framework configured (Playwright/Electron testing)
- [ ] Critical flows tested: Login, Create Transaction, Manage Products
- [ ] Tests can run in headless mode
- [ ] Screenshots captured on failure

---

### 2.2 Security Improvements

#### US-2.1: User passwords harus aman dengan bcrypt
**As a** system administrator  
**I want** user passwords encrypted with bcrypt instead of SHA1  
**So that** passwords are secure against modern attacks

**Acceptance Criteria:**
- [ ] New passwords hashed dengan bcrypt (cost factor 10)
- [ ] Existing SHA1 passwords migrated on first login
- [ ] Migration transparent untuk users
- [ ] Old SHA1 function deprecated tapi masih bisa verify
- [ ] All new user registrations use bcrypt

**Migration Strategy:**
```typescript
// On login:
1. Try bcrypt verification first
2. If fails, try SHA1 verification
3. If SHA1 succeeds, rehash with bcrypt and update DB
4. Mark password as migrated
```

#### US-2.2: Password harus memenuhi strength requirements
**As a** system administrator  
**I want** to enforce password strength rules  
**So that** user accounts are protected

**Acceptance Criteria:**
- [ ] Minimum 8 characters
- [ ] Must contain letters and numbers
- [ ] Must contain at least 1 uppercase letter
- [ ] Must contain at least 1 special character
- [ ] Password strength indicator di UI
- [ ] Clear error messages untuk weak passwords

#### US-2.3: Login attempts harus di-rate limit
**As a** system administrator  
**I want** to limit failed login attempts  
**So that** brute force attacks are prevented

**Acceptance Criteria:**
- [ ] Max 5 failed attempts per username
- [ ] 15 minute lockout after 5 failures
- [ ] Lockout counter resets after successful login
- [ ] Lockout status stored in database
- [ ] Clear message shown to locked out users
- [ ] Admin can manually unlock accounts

#### US-2.4: Session harus timeout setelah inactivity
**As a** system administrator  
**I want** sessions to timeout after 30 minutes of inactivity  
**So that** unattended terminals are protected

**Acceptance Criteria:**
- [ ] Session timeout after 30 minutes of no activity
- [ ] Activity tracked on any user interaction
- [ ] Warning shown 2 minutes before timeout
- [ ] User redirected to login on timeout
- [ ] Session data cleared on timeout

#### US-2.5: Input harus di-sanitize untuk prevent injection
**As a** developer  
**I want** all user inputs sanitized  
**So that** SQL injection and XSS attacks are prevented

**Acceptance Criteria:**
- [ ] All IPC handler inputs validated
- [ ] SQL injection prevented (verify ORM usage)
- [ ] XSS prevented in React components
- [ ] File path traversal prevented
- [ ] Command injection prevented
- [ ] Validation errors logged

---

### 2.3 Error Handling & Logging

#### US-3.1: Errors harus di-handle secara centralized
**As a** developer  
**I want** centralized error handling  
**So that** errors are consistent and properly logged

**Acceptance Criteria:**
- [ ] Centralized error handler untuk backend
- [ ] All controller errors caught and handled
- [ ] Error types defined (ValidationError, DatabaseError, etc)
- [ ] Errors logged dengan proper context
- [ ] Error responses consistent format

#### US-3.2: React errors harus di-catch dengan Error Boundary
**As a** user  
**I want** to see friendly error messages when something breaks  
**So that** I know what happened and what to do

**Acceptance Criteria:**
- [ ] Error Boundary component created
- [ ] Wraps entire application
- [ ] Shows user-friendly error page
- [ ] Logs error details for debugging
- [ ] Provides "Reload" and "Report" options
- [ ] Errors sent to activity log

#### US-3.3: API calls harus retry on failure
**As a** user  
**I want** failed API calls to retry automatically  
**So that** temporary network issues don't break my workflow

**Acceptance Criteria:**
- [ ] API utility supports retry logic
- [ ] Max 3 retry attempts
- [ ] Exponential backoff (1s, 2s, 4s)
- [ ] Only retry on network errors (not validation errors)
- [ ] Show loading state during retries
- [ ] Show error after all retries fail

#### US-3.4: Logging system harus structured
**As a** developer  
**I want** structured logging with levels  
**So that** I can debug issues effectively

**Acceptance Criteria:**
- [ ] Log levels: ERROR, WARN, INFO, DEBUG
- [ ] Logs include timestamp, level, module, message
- [ ] Logs written to file (rotating daily)
- [ ] Console logs in development only
- [ ] Sensitive data (passwords) never logged
- [ ] Log viewer in admin panel (future)

#### US-3.5: Users harus melihat friendly error messages
**As a** user  
**I want** to see clear error messages  
**So that** I understand what went wrong and how to fix it

**Acceptance Criteria:**
- [ ] No technical jargon in user-facing errors
- [ ] Actionable error messages (what to do next)
- [ ] Error codes for support reference
- [ ] Toast notifications untuk errors
- [ ] Errors logged to activity log
- [ ] Critical errors show modal with details

---

## 3. Functional Requirements

### 3.1 Testing Infrastructure

#### FR-1.1: Vitest Configuration
- Vitest configured untuk TypeScript
- Support untuk ES modules
- Coverage reporting dengan Istanbul
- Test environment: node untuk backend, jsdom untuk frontend
- Mock support untuk Electron APIs

#### FR-1.2: Test Structure
```
tests/
├── unit/
│   ├── backend/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── services/
│   └── frontend/
│       ├── components/
│       ├── utils/
│       └── contexts/
├── integration/
│   ├── ipc/
│   └── database/
├── e2e/
│   ├── auth.spec.ts
│   ├── transaction.spec.ts
│   └── product.spec.ts
└── helpers/
    ├── setup.ts
    ├── mocks.ts
    └── fixtures.ts
```

#### FR-1.3: Test Coverage Requirements
- Overall coverage: >70%
- Controllers: >80%
- Models: >80%
- Critical components: >90%
- Utilities: >85%

#### FR-1.4: Test Scripts
```json
{
  "test": "vitest",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "vitest run tests/e2e",
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest watch"
}
```

---

### 3.2 Security Improvements

#### FR-2.1: Password Hashing
```typescript
// New crypto service
interface PasswordService {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
  needsMigration(hash: string): boolean
  migrateFromSHA1(password: string, sha1Hash: string): Promise<string | null>
}
```

#### FR-2.2: Password Validation
```typescript
interface PasswordStrength {
  score: number // 0-4
  feedback: string[]
  isValid: boolean
}

function validatePasswordStrength(password: string): PasswordStrength
```

#### FR-2.3: Rate Limiting
```typescript
interface LoginAttempt {
  username: string
  timestamp: Date
  success: boolean
  ip_address?: string
}

interface RateLimiter {
  checkLimit(username: string): { allowed: boolean; remainingAttempts: number; lockoutUntil?: Date }
  recordAttempt(username: string, success: boolean): void
  resetAttempts(username: string): void
}
```

#### FR-2.4: Session Management
```typescript
interface Session {
  username: string
  loginTime: Date
  lastActivity: Date
  expiresAt: Date
}

interface SessionManager {
  create(username: string): Session
  update(username: string): void
  isValid(username: string): boolean
  destroy(username: string): void
}
```

#### FR-2.5: Input Sanitization
```typescript
interface Sanitizer {
  sanitizeString(input: string): string
  sanitizeNumber(input: unknown): number | null
  sanitizeEmail(input: string): string | null
  sanitizePath(input: string): string
  validateInput(input: unknown, schema: ZodSchema): ValidationResult
}
```

---

### 3.3 Error Handling & Logging

#### FR-3.1: Error Types
```typescript
class AppError extends Error {
  code: string
  statusCode: number
  isOperational: boolean
}

class ValidationError extends AppError {}
class DatabaseError extends AppError {}
class AuthenticationError extends AppError {}
class AuthorizationError extends AppError {}
class NotFoundError extends AppError {}
```

#### FR-3.2: Error Handler
```typescript
interface ErrorHandler {
  handle(error: Error): ErrorResponse
  log(error: Error, context?: Record<string, unknown>): void
  notify(error: Error): void
}

interface ErrorResponse {
  success: false
  message: string
  code: string
  details?: unknown
}
```

#### FR-3.3: Logger
```typescript
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface Logger {
  error(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  debug(message: string, context?: Record<string, unknown>): void
}
```

#### FR-3.4: Retry Logic
```typescript
interface RetryConfig {
  maxAttempts: number
  backoff: 'exponential' | 'linear'
  initialDelay: number
  maxDelay: number
  retryableErrors: string[]
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T>
```

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Tests harus run dalam <30 detik untuk unit tests
- Tests harus run dalam <2 menit untuk full suite
- Password hashing tidak boleh block UI (async)
- Logging tidak boleh impact performance (async, buffered)

### 4.2 Security
- Bcrypt cost factor: 10 (balance security vs performance)
- Session tokens harus cryptographically secure
- Logs tidak boleh contain sensitive data
- Rate limiting harus resistant to bypass attempts

### 4.3 Reliability
- Test suite harus deterministic (no flaky tests)
- Error handling tidak boleh crash application
- Logging harus reliable (no lost logs)
- Migration harus idempotent (safe to run multiple times)

### 4.4 Maintainability
- Test code harus readable dan well-documented
- Error messages harus clear dan actionable
- Logs harus structured dan searchable
- Code harus follow existing patterns

### 4.5 Compatibility
- Backward compatible dengan existing database
- Existing users dapat login tanpa issues
- No breaking changes to existing features
- Works on Windows dan Linux

---

## 5. Correctness Properties

### 5.1 Password Security Properties
```typescript
// Property 1: Bcrypt hashes are unique for same password
property('bcrypt_uniqueness', async () => {
  const password = fc.string({ minLength: 8 })
  const hash1 = await passwordService.hash(password)
  const hash2 = await passwordService.hash(password)
  return hash1 !== hash2 // Different salts
})

// Property 2: Verification always succeeds for correct password
property('bcrypt_verification', async () => {
  const password = fc.string({ minLength: 8 })
  const hash = await passwordService.hash(password)
  const verified = await passwordService.verify(password, hash)
  return verified === true
})

// Property 3: Verification always fails for wrong password
property('bcrypt_rejection', async () => {
  const password1 = fc.string({ minLength: 8 })
  const password2 = fc.string({ minLength: 8 }).filter(p => p !== password1)
  const hash = await passwordService.hash(password1)
  const verified = await passwordService.verify(password2, hash)
  return verified === false
})

// Property 4: SHA1 migration preserves authentication
property('sha1_migration', async () => {
  const password = fc.string({ minLength: 8 })
  const sha1Hash = crypto.createHash('sha1').update(password).digest('hex')
  const bcryptHash = await passwordService.migrateFromSHA1(password, sha1Hash)
  if (bcryptHash) {
    const verified = await passwordService.verify(password, bcryptHash)
    return verified === true
  }
  return false
})
```

### 5.2 Rate Limiting Properties
```typescript
// Property 1: Rate limiter blocks after max attempts
property('rate_limit_blocks', () => {
  const username = fc.string()
  const limiter = new RateLimiter()
  
  // Record 5 failed attempts
  for (let i = 0; i < 5; i++) {
    limiter.recordAttempt(username, false)
  }
  
  // 6th attempt should be blocked
  const result = limiter.checkLimit(username)
  return result.allowed === false
})

// Property 2: Successful login resets counter
property('rate_limit_resets', () => {
  const username = fc.string()
  const limiter = new RateLimiter()
  
  // Record 3 failed attempts
  for (let i = 0; i < 3; i++) {
    limiter.recordAttempt(username, false)
  }
  
  // Successful login
  limiter.recordAttempt(username, true)
  
  // Should be allowed again
  const result = limiter.checkLimit(username)
  return result.allowed === true && result.remainingAttempts === 5
})

// Property 3: Lockout expires after timeout
property('rate_limit_expires', async () => {
  const username = fc.string()
  const limiter = new RateLimiter()
  
  // Record 5 failed attempts
  for (let i = 0; i < 5; i++) {
    limiter.recordAttempt(username, false)
  }
  
  // Wait for lockout to expire (mock time)
  await advanceTime(15 * 60 * 1000 + 1000) // 15 min + 1 sec
  
  // Should be allowed again
  const result = limiter.checkLimit(username)
  return result.allowed === true
})
```

### 5.3 Error Handling Properties
```typescript
// Property 1: All errors are caught and handled
property('error_handling_completeness', async () => {
  const errorTypes = [
    new ValidationError('test'),
    new DatabaseError('test'),
    new AuthenticationError('test'),
    new Error('unknown')
  ]
  
  for (const error of errorTypes) {
    const response = errorHandler.handle(error)
    if (!response || response.success !== false) {
      return false
    }
  }
  return true
})

// Property 2: Errors are logged with context
property('error_logging', () => {
  const error = new Error('test error')
  const context = { user: 'test', action: 'test' }
  
  errorHandler.log(error, context)
  
  const logs = getRecentLogs()
  return logs.some(log => 
    log.message.includes('test error') &&
    log.context.user === 'test'
  )
})

// Property 3: Retry succeeds after transient failure
property('retry_success', async () => {
  let attempts = 0
  const fn = async () => {
    attempts++
    if (attempts < 3) throw new Error('transient')
    return 'success'
  }
  
  const result = await withRetry(fn, {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 100,
    maxDelay: 1000,
    retryableErrors: ['transient']
  })
  
  return result === 'success' && attempts === 3
})
```

### 5.4 Session Management Properties
```typescript
// Property 1: Session expires after timeout
property('session_timeout', async () => {
  const username = fc.string()
  const session = sessionManager.create(username)
  
  // Advance time past timeout
  await advanceTime(30 * 60 * 1000 + 1000) // 30 min + 1 sec
  
  const isValid = sessionManager.isValid(username)
  return isValid === false
})

// Property 2: Activity extends session
property('session_activity_extends', async () => {
  const username = fc.string()
  const session = sessionManager.create(username)
  
  // Advance time but update activity
  await advanceTime(20 * 60 * 1000) // 20 min
  sessionManager.update(username)
  
  await advanceTime(20 * 60 * 1000) // Another 20 min (40 total)
  
  // Should still be valid (last activity was 20 min ago)
  const isValid = sessionManager.isValid(username)
  return isValid === true
})
```

---

## 6. Dependencies & Constraints

### 6.1 Dependencies
- **Existing**: vitest, @testing-library/react, bcrypt
- **New**: @vitest/coverage-istanbul, @testing-library/user-event, fast-check (for property testing)

### 6.2 Technical Constraints
- Must maintain backward compatibility
- Cannot change database schema (use existing tables)
- Must work offline (no external services)
- Must support Windows and Linux
- Electron 30 APIs only

### 6.3 Migration Constraints
- Password migration must be transparent
- No downtime during migration
- Rollback plan must exist
- Existing sessions must remain valid

---

## 7. Success Metrics

### 7.1 Testing Metrics
- [ ] Test coverage >70%
- [ ] All critical paths tested
- [ ] Zero flaky tests
- [ ] Tests run in <2 minutes

### 7.2 Security Metrics
- [ ] 100% passwords migrated to bcrypt within 30 days
- [ ] Zero successful brute force attempts
- [ ] Zero SQL injection vulnerabilities
- [ ] Zero XSS vulnerabilities

### 7.3 Error Handling Metrics
- [ ] Zero unhandled errors in production
- [ ] 100% errors logged
- [ ] Average error resolution time <24 hours
- [ ] User satisfaction with error messages >80%

### 7.4 Performance Metrics
- [ ] Password hashing <500ms
- [ ] Test suite <2 minutes
- [ ] Logging overhead <5ms per log
- [ ] No performance regression

---

## 8. Out of Scope

The following are explicitly **NOT** included in this phase:

- Frontend implementation completion (Phase 2)
- Documentation (Phase 3)
- Performance optimization (Phase 4)
- Missing features (barcode, expired date, etc) (Phase 5-7)
- UI/UX improvements
- Database migrations
- Deployment automation
- Monitoring and alerting

---

## 9. Risks & Mitigations

### 9.1 Password Migration Risk
**Risk**: Users cannot login after migration  
**Mitigation**: Dual verification (try bcrypt first, fallback to SHA1)  
**Rollback**: Keep SHA1 function available for emergency

### 9.2 Performance Risk
**Risk**: Bcrypt slows down login  
**Mitigation**: Use cost factor 10 (balanced), async hashing  
**Monitoring**: Track login times

### 9.3 Testing Risk
**Risk**: Tests are flaky or slow  
**Mitigation**: Use proper mocks, avoid real database in unit tests  
**Monitoring**: Track test execution time

### 9.4 Breaking Changes Risk
**Risk**: New error handling breaks existing code  
**Mitigation**: Comprehensive testing, gradual rollout  
**Rollback**: Feature flags for new error handling

---

## 10. Implementation Phases

### Phase 1.1: Testing Infrastructure (Week 1)
- Setup Vitest configuration
- Create test utilities
- Write unit tests for controllers
- Write unit tests for models
- Setup coverage reporting

### Phase 1.2: Security - Password Migration (Week 2)
- Implement bcrypt service
- Add password strength validation
- Implement migration logic
- Test migration thoroughly
- Deploy with monitoring

### Phase 1.3: Security - Rate Limiting & Sessions (Week 3)
- Implement rate limiter
- Add session management
- Add input sanitization
- Test security measures
- Security audit

### Phase 1.4: Error Handling & Logging (Week 4)
- Create error types
- Implement error handler
- Add Error Boundary
- Implement logger
- Add retry logic
- Test error scenarios

---

## 11. Acceptance Criteria Summary

This feature is considered **DONE** when:

- [ ] All user stories completed
- [ ] Test coverage >70%
- [ ] All passwords can be migrated to bcrypt
- [ ] Rate limiting works correctly
- [ ] Sessions timeout properly
- [ ] All errors handled gracefully
- [ ] Logging system operational
- [ ] All correctness properties pass
- [ ] No security vulnerabilities
- [ ] No performance regression
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-27  
**Status**: Draft - Ready for Review
