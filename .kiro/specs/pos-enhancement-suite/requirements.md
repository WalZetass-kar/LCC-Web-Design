# Requirements Document: POS Enhancement Suite

## Introduction

MediaSoft POS adalah aplikasi Point of Sale desktop yang dibangun dengan Electron, React, TypeScript, dan SQLite. Aplikasi ini saat ini memiliki backend yang 100% complete namun frontend baru 30% complete, tanpa testing, security yang lemah (SHA1), error handling yang minimal, dan tidak ada documentation. POS Enhancement Suite adalah inisiatif untuk membuat aplikasi production-ready dengan menambahkan 7 kategori improvement: Testing Infrastructure, Frontend Implementation, Error Handling & Logging, Security Improvements, Documentation, Performance Optimization, dan Missing Features Implementation.

## Glossary

- **POS_System**: Aplikasi MediaSoft POS secara keseluruhan
- **Test_Runner**: Framework testing (Vitest) yang menjalankan unit dan integration tests
- **E2E_Framework**: Framework end-to-end testing (Playwright atau Cypress)
- **Frontend_App**: Aplikasi React yang berjalan di renderer process Electron
- **Backend_Service**: Controllers dan Models yang berjalan di main process Electron
- **Error_Handler**: Sistem centralized untuk menangani dan logging errors
- **Security_Module**: Komponen yang menangani authentication, authorization, dan data protection
- **Documentation_System**: Kumpulan dokumentasi teknis dan user manual
- **Performance_Monitor**: Sistem untuk monitoring dan optimizing performance
- **Barcode_Scanner**: Hardware atau software untuk scanning barcode produk
- **Notification_System**: Sistem untuk menampilkan alerts dan notifications kepada user
- **Backup_Scheduler**: Automated system untuk backup database secara berkala
- **Password_Hasher**: Modul untuk hashing password menggunakan bcrypt
- **Rate_Limiter**: Sistem untuk membatasi jumlah login attempts
- **Input_Validator**: Modul untuk validasi dan sanitasi user input
- **Query_Optimizer**: Sistem untuk optimizing database queries
- **Code_Splitter**: Mekanisme untuk splitting code bundles
- **Lazy_Loader**: Mekanisme untuk lazy loading routes dan components
- **Tax_Calculator**: Modul untuk menghitung pajak/PPN
- **Loyalty_Calculator**: Modul untuk menghitung poin loyalty customer
- **Email_Service**: Service untuk mengirim email notifications
- **Print_Service**: Service untuk print barcode labels dan reports
- **Return_Manager**: Modul untuk menangani return dan refund penjualan
- **Payment_Processor**: Modul untuk menangani multiple payment methods per transaksi
- **Stock_Opname_Manager**: Modul untuk menangani stock opname/physical count
- **Discount_Engine**: Modul untuk menangani berbagai jenis diskon dan promosi
- **Refund_Processor**: Modul untuk memproses refund dan exchange produk

## Requirements

### Requirement 1: Testing Infrastructure Setup

**User Story:** As a developer, I want comprehensive testing infrastructure, so that I can ensure code quality and prevent regressions.

#### Acceptance Criteria

1. THE Test_Runner SHALL execute unit tests for all Backend_Service controllers and models
2. THE Test_Runner SHALL execute component tests for all Frontend_App React components
3. THE E2E_Framework SHALL execute end-to-end tests for critical user workflows
4. WHEN all tests are executed, THE Test_Runner SHALL generate a coverage report showing at least 70% code coverage
5. THE Test_Runner SHALL complete all unit and integration tests within 60 seconds
6. THE E2E_Framework SHALL complete all end-to-end tests within 300 seconds
7. WHEN a test fails, THE Test_Runner SHALL provide detailed error messages and stack traces
8. THE POS_System SHALL integrate testing into CI/CD pipeline for automated execution

### Requirement 2: Frontend Pages Implementation

**User Story:** As a user, I want all missing frontend pages implemented, so that I can access all system features through the UI.

#### Acceptance Criteria

1. THE Frontend_App SHALL provide a Pembelian page displaying all purchase orders with pagination
2. THE Frontend_App SHALL provide a Pembelian Create page for creating new purchase orders
3. THE Frontend_App SHALL provide a Backup & Restore page for database management
4. THE Frontend_App SHALL provide an Activity Log page displaying all user activities
5. THE Frontend_App SHALL provide a Notifikasi page displaying all system notifications
6. THE Frontend_App SHALL display a NotificationBell component in the topbar with unread count badge
7. WHEN a user clicks on a notification, THE Frontend_App SHALL mark it as read
8. THE Frontend_App SHALL provide barcode scanner UI integration for product search
9. THE Frontend_App SHALL display expired date warnings for products approaching expiration
10. WHEN a page is loading, THE Frontend_App SHALL display a loading spinner
11. WHEN a page has no data, THE Frontend_App SHALL display an appropriate empty state message

### Requirement 3: Centralized Error Handling

**User Story:** As a user, I want clear error messages and proper error handling, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. THE Error_Handler SHALL catch all unhandled exceptions in Backend_Service
2. THE Error_Handler SHALL catch all unhandled exceptions in Frontend_App using React Error Boundary
3. WHEN an error occurs, THE Error_Handler SHALL log the error with timestamp, user context, and stack trace
4. WHEN an error occurs, THE Frontend_App SHALL display a user-friendly error message
5. THE Error_Handler SHALL categorize errors by severity (INFO, WARNING, ERROR, CRITICAL)
6. WHEN a network request fails, THE Error_Handler SHALL retry the request up to 3 times with exponential backoff
7. THE Error_Handler SHALL write error logs to a structured log file
8. WHEN a critical error occurs, THE Error_Handler SHALL create a notification for administrators
9. THE Error_Handler SHALL sanitize error messages to prevent exposure of sensitive information

### Requirement 4: Security Hardening

**User Story:** As a system administrator, I want robust security measures, so that user data and system access are protected.

#### Acceptance Criteria

1. THE Password_Hasher SHALL hash all passwords using bcrypt with a cost factor of 12
2. THE Security_Module SHALL migrate existing SHA1 password hashes to bcrypt on next user login
3. THE Rate_Limiter SHALL block login attempts for 15 minutes after 5 failed attempts from the same username
4. THE Input_Validator SHALL sanitize all user input to prevent XSS attacks
5. THE Input_Validator SHALL validate all user input against expected data types and formats
6. THE Security_Module SHALL enforce password requirements (minimum 8 characters, at least one uppercase, one lowercase, one number)
7. WHEN a user is inactive for 30 minutes, THE Security_Module SHALL automatically log out the user
8. THE Security_Module SHALL log all authentication attempts and authorization failures to Activity Log
9. THE Security_Module SHALL encrypt sensitive data in the database using AES-256
10. THE Security_Module SHALL validate all IPC messages to prevent injection attacks

### Requirement 5: Comprehensive Documentation

**User Story:** As a developer and user, I want comprehensive documentation, so that I can understand, maintain, and use the system effectively.

#### Acceptance Criteria

1. THE Documentation_System SHALL provide JSDoc comments for all public functions and classes
2. THE Documentation_System SHALL provide inline comments for complex business logic
3. THE Documentation_System SHALL provide an Architecture document describing system components and their interactions
4. THE Documentation_System SHALL provide a Database Schema document with entity relationship diagrams
5. THE Documentation_System SHALL provide a Developer Onboarding guide with setup instructions
6. THE Documentation_System SHALL provide a Deployment guide with production deployment steps
7. THE Documentation_System SHALL provide a User Manual with screenshots and step-by-step instructions
8. THE Documentation_System SHALL provide API documentation for all IPC handlers
9. WHEN code is updated, THE Documentation_System SHALL be updated to reflect the changes

### Requirement 6: Performance Optimization

**User Story:** As a user, I want fast application performance, so that I can work efficiently without delays.

#### Acceptance Criteria

1. THE Code_Splitter SHALL split the Frontend_App bundle into chunks smaller than 500KB each
2. THE Lazy_Loader SHALL lazy load all route components to reduce initial load time
3. THE Frontend_App SHALL load the initial page within 2 seconds on standard hardware
4. THE Frontend_App SHALL implement React Query or SWR for caching API responses
5. THE Frontend_App SHALL debounce search inputs with a 300ms delay
6. WHEN displaying tables with more than 100 rows, THE Frontend_App SHALL use virtualization
7. THE Frontend_App SHALL memoize expensive computations using React.memo and useMemo
8. THE Query_Optimizer SHALL ensure all database queries execute within 100ms
9. THE Query_Optimizer SHALL add appropriate indexes to frequently queried database columns
10. WHEN the application starts, THE POS_System SHALL preload critical data into memory

### Requirement 7: Barcode Scanner Integration

**User Story:** As a cashier, I want to scan product barcodes, so that I can quickly add products to transactions.

#### Acceptance Criteria

1. THE Barcode_Scanner SHALL accept barcode input from USB barcode scanner devices
2. THE Barcode_Scanner SHALL accept barcode input from Bluetooth barcode scanner devices
3. WHEN a barcode is scanned, THE POS_System SHALL search for the product by barcode
4. WHEN a matching product is found, THE POS_System SHALL add it to the transaction cart
5. WHEN no matching product is found, THE POS_System SHALL display an error message
6. THE Frontend_App SHALL provide a manual barcode input field as fallback
7. THE Print_Service SHALL generate printable barcode labels in Code128 format
8. THE Frontend_App SHALL allow users to print barcode labels for selected products

### Requirement 8: Expired Date Tracking and Alerts

**User Story:** As a store manager, I want automatic alerts for expiring products, so that I can take action before products expire.

#### Acceptance Criteria

1. THE POS_System SHALL check for expiring products daily at 08:00 AM
2. WHEN a product will expire within 7 days, THE Notification_System SHALL create an alert notification
3. WHEN a product has expired, THE Notification_System SHALL create a critical notification
4. THE Frontend_App SHALL display expired products with a red badge on the Dashboard
5. THE Frontend_App SHALL display expiring products with an orange badge on the Dashboard
6. THE Frontend_App SHALL provide a filter to view all expiring and expired products
7. WHEN creating a purchase order, THE Frontend_App SHALL allow input of expired date for each product
8. THE POS_System SHALL prevent selling expired products in transactions

### Requirement 9: Tax Calculation System

**User Story:** As a store owner, I want automatic tax calculation, so that I comply with tax regulations and generate accurate invoices.

#### Acceptance Criteria

1. THE Tax_Calculator SHALL calculate tax based on the percentage configured in store settings
2. WHEN a transaction is created, THE Tax_Calculator SHALL apply tax to the subtotal
3. THE Frontend_App SHALL display tax amount separately on transaction receipts
4. THE Frontend_App SHALL display tax amount separately on printed receipts
5. THE Frontend_App SHALL allow administrators to configure tax percentage in Settings
6. THE POS_System SHALL generate monthly tax reports showing total tax collected
7. THE Frontend_App SHALL allow input of NPWP (tax identification number) in store identity settings

### Requirement 10: Automated Backup System

**User Story:** As a system administrator, I want automated database backups, so that I can recover data in case of system failure.

#### Acceptance Criteria

1. THE Backup_Scheduler SHALL create automatic database backups daily at 02:00 AM
2. THE Backup_Scheduler SHALL create automatic database backups weekly on Sunday at 03:00 AM
3. WHEN a backup is created, THE Backup_Scheduler SHALL compress the database file using gzip
4. WHEN a backup is created, THE Backup_Scheduler SHALL store metadata (filename, size, date) in the backup table
5. THE Frontend_App SHALL display all backup history with file size and creation date
6. THE Frontend_App SHALL allow users to download backup files to external storage
7. THE Frontend_App SHALL allow users to restore database from a selected backup
8. WHEN restoring a backup, THE POS_System SHALL create a backup of current database first
9. THE Backup_Scheduler SHALL automatically delete backups older than 90 days
10. WHEN a backup operation fails, THE Notification_System SHALL create an alert notification

### Requirement 11: Email Notification System

**User Story:** As a store owner, I want email notifications for important events, so that I stay informed even when not using the application.

#### Acceptance Criteria

1. THE Email_Service SHALL send email notifications for low stock alerts
2. THE Email_Service SHALL send email notifications for expiring products
3. THE Email_Service SHALL send email notifications for daily sales summary
4. THE Email_Service SHALL send email notifications for backup failures
5. THE Frontend_App SHALL allow administrators to configure SMTP settings in Settings
6. THE Frontend_App SHALL allow administrators to enable or disable email notifications by type
7. WHEN an email fails to send, THE Email_Service SHALL retry up to 3 times
8. WHEN an email fails after all retries, THE Notification_System SHALL create an alert notification

### Requirement 12: Loyalty Points System

**User Story:** As a store owner, I want a loyalty points system, so that I can reward repeat customers and increase customer retention.

#### Acceptance Criteria

1. THE Loyalty_Calculator SHALL award 1 point for every Rp 10,000 spent
2. WHEN a transaction is completed with a customer, THE Loyalty_Calculator SHALL calculate and add points to customer account
3. THE Frontend_App SHALL display current loyalty points on customer profile
4. THE Frontend_App SHALL display loyalty points earned on transaction receipt
5. THE Frontend_App SHALL allow cashiers to redeem loyalty points for discounts (100 points = Rp 10,000 discount)
6. WHEN points are redeemed, THE Loyalty_Calculator SHALL deduct points from customer account
7. THE POS_System SHALL generate loyalty points reports showing points earned and redeemed per customer

### Requirement 13: Birthday Reminder System

**User Story:** As a store owner, I want birthday reminders for customers, so that I can send greetings and special offers to increase customer engagement.

#### Acceptance Criteria

1. THE Notification_System SHALL check for customer birthdays daily at 08:00 AM
2. WHEN a customer birthday is today, THE Notification_System SHALL create a notification
3. WHEN a customer birthday is within 7 days, THE Notification_System SHALL create a reminder notification
4. THE Frontend_App SHALL display birthday customers on the Dashboard
5. THE Email_Service SHALL send birthday greeting emails to customers with email addresses
6. THE Frontend_App SHALL allow administrators to configure birthday email template in Settings

### Requirement 14: Stock Minimum Alert System

**User Story:** As a store manager, I want automatic alerts when stock is low, so that I can reorder products before running out.

#### Acceptance Criteria

1. THE POS_System SHALL check stock levels after every transaction
2. WHEN a product stock reaches or falls below the minimum stock level, THE Notification_System SHALL create a low stock alert
3. THE Frontend_App SHALL display low stock products on the Dashboard with a warning badge
4. THE Frontend_App SHALL allow users to set minimum stock level for each product
5. THE Frontend_App SHALL provide a filter to view all low stock products
6. THE Email_Service SHALL send daily low stock summary emails to administrators
7. WHEN stock is replenished above minimum level, THE Notification_System SHALL mark the alert as resolved

### Requirement 15: Activity Logging System

**User Story:** As a system administrator, I want comprehensive activity logs, so that I can audit user actions and troubleshoot issues.

#### Acceptance Criteria

1. THE POS_System SHALL log all user login and logout events
2. THE POS_System SHALL log all create, update, and delete operations on products, customers, suppliers, and users
3. THE POS_System SHALL log all transactions (sales and purchases)
4. THE POS_System SHALL log all backup and restore operations
5. THE POS_System SHALL log all settings changes
6. WHEN an activity is logged, THE POS_System SHALL record username, timestamp, module, action, and details
7. THE Frontend_App SHALL provide an Activity Log page accessible only to administrators
8. THE Frontend_App SHALL allow filtering activity logs by username, module, and date range
9. THE Frontend_App SHALL allow searching activity logs by keyword
10. THE Frontend_App SHALL allow exporting activity logs to Excel format

### Requirement 16: React Error Boundary Implementation

**User Story:** As a user, I want the application to handle errors gracefully, so that one component error doesn't crash the entire application.

#### Acceptance Criteria

1. THE Frontend_App SHALL wrap all route components with React Error Boundary
2. WHEN a component throws an error, THE Error_Boundary SHALL catch the error and display a fallback UI
3. THE Error_Boundary SHALL log the error details to the Error_Handler
4. THE Error_Boundary SHALL provide a "Reload" button to attempt recovery
5. THE Error_Boundary SHALL provide a "Report Issue" button to send error details to administrators
6. WHEN an error is caught, THE Error_Boundary SHALL preserve application state outside the failed component

### Requirement 17: Input Validation and Sanitization

**User Story:** As a system administrator, I want all user inputs validated and sanitized, so that the system is protected from malicious input and data integrity is maintained.

#### Acceptance Criteria

1. THE Input_Validator SHALL validate all numeric inputs to ensure they are valid numbers
2. THE Input_Validator SHALL validate all email inputs to ensure they match email format
3. THE Input_Validator SHALL validate all phone number inputs to ensure they match phone format
4. THE Input_Validator SHALL validate all date inputs to ensure they are valid dates
5. THE Input_Validator SHALL sanitize all text inputs to remove HTML tags and script tags
6. THE Input_Validator SHALL validate all required fields before form submission
7. WHEN validation fails, THE Frontend_App SHALL display specific error messages for each invalid field
8. THE Input_Validator SHALL validate input length to prevent buffer overflow attacks
9. THE Input_Validator SHALL validate file uploads to ensure they are allowed file types and within size limits

### Requirement 18: Session Management and Timeout

**User Story:** As a system administrator, I want automatic session timeout, so that unattended terminals are protected from unauthorized access.

#### Acceptance Criteria

1. THE Security_Module SHALL track user activity (mouse movements, keyboard input, clicks)
2. WHEN a user is inactive for 30 minutes, THE Security_Module SHALL display a session timeout warning
3. WHEN a user is inactive for 31 minutes, THE Security_Module SHALL automatically log out the user
4. WHEN the timeout warning is displayed, THE Security_Module SHALL provide a "Stay Logged In" button
5. WHEN the user clicks "Stay Logged In", THE Security_Module SHALL reset the inactivity timer
6. THE Frontend_App SHALL allow administrators to configure session timeout duration in Settings
7. WHEN a user is logged out due to timeout, THE Frontend_App SHALL redirect to the login page with a timeout message

### Requirement 19: Database Query Optimization

**User Story:** As a user, I want fast data retrieval, so that I can work efficiently without waiting for slow queries.

#### Acceptance Criteria

1. THE Query_Optimizer SHALL add indexes to kd_barang column in barang table
2. THE Query_Optimizer SHALL add indexes to kd_tansaksi_jual column in penjualan table
3. THE Query_Optimizer SHALL add indexes to username column in pengguna table
4. THE Query_Optimizer SHALL add indexes to tgl_wkt_transaksi column in penjualan table
5. THE Query_Optimizer SHALL add indexes to kd_customer column in customer table
6. THE Query_Optimizer SHALL use prepared statements for all parameterized queries
7. THE Query_Optimizer SHALL limit query results to 100 rows by default with pagination
8. THE Query_Optimizer SHALL use database transactions for multi-step operations
9. WHEN a query takes longer than 100ms, THE Performance_Monitor SHALL log a slow query warning

### Requirement 20: Code Splitting and Lazy Loading

**User Story:** As a user, I want fast application startup, so that I can start working quickly.

#### Acceptance Criteria

1. THE Code_Splitter SHALL split vendor libraries into a separate bundle
2. THE Code_Splitter SHALL split each route into a separate bundle
3. THE Lazy_Loader SHALL lazy load route components using React.lazy
4. THE Lazy_Loader SHALL display a loading spinner while lazy loading components
5. THE Code_Splitter SHALL ensure the main bundle is smaller than 300KB
6. THE Code_Splitter SHALL ensure vendor bundle is smaller than 500KB
7. THE Frontend_App SHALL preload critical routes (Dashboard, Transaksi) on application start
8. THE Frontend_App SHALL prefetch route bundles on hover over navigation links

### Requirement 21: Caching Strategy Implementation

**User Story:** As a user, I want fast data access, so that I don't have to wait for repeated data fetches.

#### Acceptance Criteria

1. THE Frontend_App SHALL cache product list data for 5 minutes
2. THE Frontend_App SHALL cache category and unit data for 30 minutes
3. THE Frontend_App SHALL cache customer list data for 5 minutes
4. THE Frontend_App SHALL cache supplier list data for 5 minutes
5. THE Frontend_App SHALL cache dashboard statistics for 1 minute
6. WHEN cached data is updated, THE Frontend_App SHALL invalidate the cache
7. WHEN a mutation occurs (create, update, delete), THE Frontend_App SHALL invalidate related caches
8. THE Frontend_App SHALL implement optimistic updates for better perceived performance
9. THE Frontend_App SHALL display stale data while revalidating in the background

### Requirement 22: Debouncing and Throttling

**User Story:** As a user, I want responsive search functionality, so that I can find products quickly without overwhelming the system.

#### Acceptance Criteria

1. THE Frontend_App SHALL debounce search input with a 300ms delay
2. THE Frontend_App SHALL debounce filter inputs with a 300ms delay
3. THE Frontend_App SHALL throttle scroll events to once per 100ms
4. THE Frontend_App SHALL throttle window resize events to once per 200ms
5. WHEN a user types in search input, THE Frontend_App SHALL wait for 300ms of inactivity before executing search
6. THE Frontend_App SHALL cancel pending search requests when new input is received

### Requirement 23: Virtual Scrolling for Large Lists

**User Story:** As a user, I want smooth scrolling through large product lists, so that I can browse inventory efficiently.

#### Acceptance Criteria

1. WHEN a table displays more than 100 rows, THE Frontend_App SHALL use virtual scrolling
2. THE Frontend_App SHALL render only visible rows plus a buffer of 10 rows above and below
3. THE Frontend_App SHALL maintain smooth scrolling at 60 frames per second
4. THE Frontend_App SHALL preserve scroll position when navigating back to a list
5. THE Frontend_App SHALL support keyboard navigation in virtualized lists

### Requirement 24: Memoization for Expensive Computations

**User Story:** As a user, I want fast UI updates, so that the application feels responsive.

#### Acceptance Criteria

1. THE Frontend_App SHALL memoize product list filtering using React.useMemo
2. THE Frontend_App SHALL memoize transaction total calculations using React.useMemo
3. THE Frontend_App SHALL memoize dashboard statistics calculations using React.useMemo
4. THE Frontend_App SHALL memoize component renders using React.memo when props don't change
5. THE Frontend_App SHALL memoize callback functions using React.useCallback to prevent unnecessary re-renders

### Requirement 25: Print Service for Barcode Labels

**User Story:** As a store manager, I want to print barcode labels, so that I can label products for easy scanning.

#### Acceptance Criteria

1. THE Print_Service SHALL generate barcode labels in Code128 format
2. THE Print_Service SHALL include product name on barcode labels
3. THE Print_Service SHALL include product price on barcode labels
4. THE Print_Service SHALL support printing multiple labels for the same product
5. THE Frontend_App SHALL provide a print preview before printing
6. THE Print_Service SHALL support standard label sizes (40mm x 30mm, 50mm x 30mm)
7. THE Frontend_App SHALL allow users to select label size before printing
8. THE Print_Service SHALL support batch printing for multiple products

### Requirement 26: CI/CD Integration for Automated Testing

**User Story:** As a developer, I want automated testing in CI/CD pipeline, so that code quality is maintained and bugs are caught early.

#### Acceptance Criteria

1. THE POS_System SHALL run all unit tests on every git push
2. THE POS_System SHALL run all integration tests on every pull request
3. THE POS_System SHALL run all E2E tests before merging to main branch
4. WHEN any test fails, THE POS_System SHALL block the merge
5. THE POS_System SHALL generate and publish test coverage reports
6. THE POS_System SHALL fail the build if code coverage drops below 70%
7. THE POS_System SHALL run linting checks on every commit
8. THE POS_System SHALL run type checking on every commit

### Requirement 27: Migration Script for SHA1 to Bcrypt

**User Story:** As a system administrator, I want existing passwords migrated to bcrypt, so that user accounts are secured without requiring password resets.

#### Acceptance Criteria

1. THE Security_Module SHALL provide a migration script to identify all SHA1 hashed passwords
2. THE Security_Module SHALL add a password_hash_type column to pengguna table
3. WHEN a user with SHA1 password logs in successfully, THE Security_Module SHALL rehash the password using bcrypt
4. WHEN a user with SHA1 password logs in successfully, THE Security_Module SHALL update password_hash_type to 'bcrypt'
5. THE Security_Module SHALL maintain backward compatibility with SHA1 during migration period
6. THE Frontend_App SHALL display a migration status report showing percentage of users migrated
7. THE Security_Module SHALL log all password migrations to Activity Log

### Requirement 28: Structured Logging System

**User Story:** As a developer, I want structured logs, so that I can easily search, filter, and analyze log data.

#### Acceptance Criteria

1. THE Error_Handler SHALL write logs in JSON format
2. THE Error_Handler SHALL include timestamp, log level, module, message, and context in every log entry
3. THE Error_Handler SHALL write logs to daily rotating log files
4. THE Error_Handler SHALL keep log files for 30 days
5. THE Error_Handler SHALL compress log files older than 7 days
6. THE Frontend_App SHALL provide a log viewer for administrators
7. THE Frontend_App SHALL allow filtering logs by level, module, and date range
8. THE Error_Handler SHALL redact sensitive information (passwords, tokens) from logs

### Requirement 29: User Manual with Screenshots

**User Story:** As a new user, I want a comprehensive user manual, so that I can learn how to use the system effectively.

#### Acceptance Criteria

1. THE Documentation_System SHALL provide a user manual in PDF format
2. THE Documentation_System SHALL include screenshots for every major feature
3. THE Documentation_System SHALL provide step-by-step instructions for common tasks
4. THE Documentation_System SHALL include a table of contents with page numbers
5. THE Documentation_System SHALL include a glossary of terms
6. THE Documentation_System SHALL include troubleshooting section for common issues
7. THE Documentation_System SHALL include keyboard shortcuts reference
8. THE Documentation_System SHALL be available in Indonesian language

### Requirement 30: API Documentation for IPC Handlers

**User Story:** As a developer, I want API documentation for all IPC handlers, so that I can understand how to use them correctly.

#### Acceptance Criteria

1. THE Documentation_System SHALL document all IPC handler names and channels
2. THE Documentation_System SHALL document all parameters for each IPC handler
3. THE Documentation_System SHALL document return types for each IPC handler
4. THE Documentation_System SHALL document error cases for each IPC handler
5. THE Documentation_System SHALL provide example usage for each IPC handler
6. THE Documentation_System SHALL generate API documentation from JSDoc comments
7. THE Documentation_System SHALL publish API documentation in HTML format
8. THE Documentation_System SHALL include a search function in API documentation

### Requirement 31: Sales Return and Refund Management

**User Story:** As a cashier, I want to process sales returns and refunds, so that I can handle customer complaints and maintain customer satisfaction.

#### Acceptance Criteria

1. THE Return_Manager SHALL allow cashiers to search for original transactions by transaction ID or date
2. THE Return_Manager SHALL display all items from the original transaction for selection
3. THE Frontend_App SHALL allow cashiers to select which items to return and specify quantities
4. THE Return_Manager SHALL require a return reason for each returned item (Defective, Wrong Item, Customer Changed Mind, Expired, Other)
5. WHEN a return is processed, THE Return_Manager SHALL create a return transaction record linked to the original transaction
6. THE Return_Manager SHALL automatically add returned items back to inventory stock
7. THE Refund_Processor SHALL calculate refund amount based on original item prices minus any discounts
8. THE Frontend_App SHALL allow administrators to approve or reject return requests above a configurable threshold (default Rp 500,000)
9. THE Return_Manager SHALL prevent returns for transactions older than 30 days (configurable)
10. THE Frontend_App SHALL print a return receipt showing returned items, refund amount, and return reason
11. THE POS_System SHALL log all return transactions to Activity Log
12. THE Frontend_App SHALL provide a Returns Report showing all returns by date, reason, and product

### Requirement 32: Multiple Payment Methods per Transaction

**User Story:** As a cashier, I want to accept multiple payment methods in a single transaction, so that I can accommodate customers who want to split payments.

#### Acceptance Criteria

1. THE Payment_Processor SHALL support splitting a transaction across multiple payment methods (Tunai, Transfer, Debit Card, Credit Card, E-Wallet)
2. THE Frontend_App SHALL display a payment breakdown interface showing remaining amount to be paid
3. WHEN a cashier adds a payment, THE Payment_Processor SHALL deduct the amount from the remaining balance
4. THE Payment_Processor SHALL allow up to 3 different payment methods per transaction
5. THE Frontend_App SHALL validate that total payment amount equals or exceeds the transaction total
6. WHEN payment exceeds transaction total, THE Payment_Processor SHALL calculate change only for cash payments
7. THE Frontend_App SHALL display all payment methods used on the transaction receipt
8. THE POS_System SHALL store each payment method and amount in the penjualan_pembayaran table
9. THE Frontend_App SHALL allow cashiers to remove or modify payment entries before finalizing the transaction
10. THE POS_System SHALL generate payment method reports showing breakdown of sales by payment type

### Requirement 33: Stock Opname (Physical Inventory Count)

**User Story:** As a store manager, I want to perform physical inventory counts, so that I can reconcile system stock with actual physical stock.

#### Acceptance Criteria

1. THE Stock_Opname_Manager SHALL allow managers to create a new stock opname session with a reference number and date
2. THE Frontend_App SHALL provide a Stock Opname page displaying all products with current system stock
3. THE Frontend_App SHALL allow users to input actual physical count for each product
4. THE Stock_Opname_Manager SHALL calculate variance (difference between system stock and physical count) for each product
5. THE Frontend_App SHALL highlight products with variances in red (negative) or green (positive)
6. THE Stock_Opname_Manager SHALL allow users to add notes/reasons for significant variances
7. WHEN a stock opname is finalized, THE Stock_Opname_Manager SHALL adjust system stock to match physical count
8. THE Stock_Opname_Manager SHALL create adjustment transactions for all stock changes
9. THE Frontend_App SHALL require manager approval before finalizing stock opname adjustments
10. THE POS_System SHALL log all stock opname activities to Activity Log
11. THE Frontend_App SHALL generate Stock Opname Report showing all variances and adjustments
12. THE Stock_Opname_Manager SHALL support partial stock opname (counting only selected products or categories)
13. THE Frontend_App SHALL allow exporting stock opname data to Excel for offline counting

### Requirement 34: Advanced Discount and Promotion System

**User Story:** As a store owner, I want flexible discount and promotion options, so that I can run marketing campaigns to increase sales.

#### Acceptance Criteria

1. THE Discount_Engine SHALL support percentage discounts (e.g., 10% off)
2. THE Discount_Engine SHALL support fixed amount discounts (e.g., Rp 50,000 off)
3. THE Discount_Engine SHALL support buy X get Y free promotions (e.g., buy 2 get 1 free)
4. THE Discount_Engine SHALL support quantity-based discounts (e.g., buy 3+ items get 15% off)
5. THE Discount_Engine SHALL support time-based discounts (e.g., happy hour 14:00-16:00)
6. THE Discount_Engine SHALL support minimum purchase discounts (e.g., spend Rp 100,000 get 10% off)
7. THE Frontend_App SHALL allow administrators to create and manage promotions with start and end dates
8. THE Discount_Engine SHALL automatically apply the best available discount for each product
9. THE Discount_Engine SHALL allow stacking of certain discount types (configurable)
10. THE Frontend_App SHALL display active promotions on the POS transaction screen
11. THE Discount_Engine SHALL validate promotion eligibility before applying discounts
12. THE Frontend_App SHALL show original price and discounted price on receipts
13. THE POS_System SHALL generate Promotion Performance Report showing sales impact of each promotion
14. THE Discount_Engine SHALL support category-wide discounts (e.g., 20% off all electronics)
15. THE Frontend_App SHALL allow cashiers to apply manual discounts with manager approval

### Requirement 35: Customer Credit and Receivables Management

**User Story:** As a store owner, I want to track customer credit and receivables, so that I can offer credit to trusted customers and manage outstanding payments.

#### Acceptance Criteria

1. THE POS_System SHALL allow administrators to set credit limits for individual customers
2. THE Frontend_App SHALL display customer credit limit and current outstanding balance on customer profile
3. WHEN a transaction is created on credit, THE POS_System SHALL validate that the transaction amount does not exceed available credit
4. THE POS_System SHALL create a receivable record for credit transactions
5. THE Frontend_App SHALL provide a Receivables page showing all outstanding customer debts
6. THE Frontend_App SHALL allow cashiers to record partial or full payments against receivables
7. WHEN a payment is recorded, THE POS_System SHALL update the customer's outstanding balance
8. THE POS_System SHALL calculate and display aging of receivables (0-30 days, 31-60 days, 61-90 days, 90+ days)
9. THE Notification_System SHALL create alerts for overdue receivables (configurable threshold)
10. THE Email_Service SHALL send payment reminder emails to customers with overdue balances
11. THE Frontend_App SHALL allow administrators to adjust or write off bad debts with proper authorization
12. THE POS_System SHALL generate Receivables Aging Report showing all outstanding balances by customer
13. THE Frontend_App SHALL prevent customers from making new credit purchases when they exceed their credit limit
14. THE POS_System SHALL log all credit transactions and payments to Activity Log
15. THE Frontend_App SHALL display payment history for each customer showing all credit transactions and payments

