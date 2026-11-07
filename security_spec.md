# Security Specification: Deeniya Arabic College Library

## 1. Data Invariants
- **Public Read Access**: Anonymous/public visitors can ONLY read the general bibliographic catalog (`/books/{bookId}`) and physical inventory statuses (`/copies/{copyId}`) to search and verify book availability.
- **PII Protection**: Student profiles (`/students/{studentId}`) contain sensitive PII (guardian name, telephone, residence address, photo). They are strictly restricted to verified Super Admins (`isSuperAdmin()`). Public visitors cannot read, list, or mutate student profiles.
- **Circulation Privacy**: Loan records (`/loans/{loanId}`) contain student borrowing histories and cannot be read or modified by unauthenticated or public visitors.
- **Administrative Write Protection**: All mutations (create, update, delete) across all collections are restricted to the verified Super Admin (`dheeniyyalibrarymanagement@gmail.com`).
- **Security Audit Logs**: `/security_logs/{logId}` can only be read by the Super Admin. Log writes are strictly structured and immutable once written.
- **No Self-Registration**: Public visitors cannot create `/admins/{adminUid}` documents. Only the pre-configured Super Admin or existing admin can provision admin accounts.

## 2. The "Dirty Dozen" Threat Payloads
1. **Public Catalog Tamper**: Public user attempts `setDoc('/books/fake-book', { t: 'Hacked', a: 'Attacker' })` -> **DENIED**.
2. **Student PII Scraping**: Public user attempts `getDocs('/students')` or `getDoc('/students/STU-0001')` -> **DENIED**.
3. **Privilege Escalation**: Non-admin attempts to create `/admins/attacker_uid` -> **DENIED**.
4. **Circulation Falsification**: Public user attempts to mark loan as returned or issue unauthorized loan -> **DENIED**.
5. **ID Poisoning**: Attempt to use path traversal or oversized path ID > 128 chars (`/books/$$%invalid%^^`) -> **DENIED**.
6. **Denial of Wallet / Payload Bloat**: Attempt to write 2MB book title or inject arbitrary keys -> **DENIED**.
7. **Email Spoofing Attack**: Authenticated user with email `dheeniyyalibrarymanagement@gmail.com` but `email_verified: false` -> **DENIED**.
8. **Shadow Field Injection**: Attempt to inject `{ isAdmin: true, role: 'superadmin' }` into student or book records -> **DENIED**.
9. **Log Tampering / Deletion**: Attempt to delete or rewrite audit log entries -> **DENIED**.
10. **Settings Hijacking**: Attempt to alter college name or loan duration by non-admin -> **DENIED**.
11. **Student Deletion Bypass**: Public user calling delete on a student record -> **DENIED**.
12. **Blanket Query Scraping**: Attempting an unrestricted collection query on private endpoints -> **DENIED**.
