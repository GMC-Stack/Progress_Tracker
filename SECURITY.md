# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.
# 🔐 Security Policy - Progress Tracker

## Overview

The Life Balance Tracker is a **fully local, offline tool**.  
It runs entirely on your device — no data is ever sent to any server, no internet connection is required, and no personal information is collected or stored anywhere outside your own machine.

This document explains how the file is protected, what that protection means in practice, and how to report any security concerns.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0     | ✅ Current — actively maintained |

---

## File Protection

### Sheet protection
All sheets in the Excel file are **protected with a password**.  
This protection is designed to:

- Prevent accidental modification of formulas and calculated cells
- Preserve the integrity of the tracker's logic and structure
- Ensure that only designated input cells can be edited by the user

### ⚠️ Important disclaimer
Excel sheet protection is **not encryption**.  
It is a structural safeguard against unintentional edits — not a security measure against determined users with technical knowledge.  
Do not rely on this protection to store sensitive, confidential, or private information inside the file.

### What is protected
- All formula cells across every sheet
- Dashboard and summary areas
- Chart and statistics ranges

### What is intentionally left editable
- All designated input cells (ratings, goals, descriptions, dates)
- Dropdown selection fields

---

## Data Privacy

The Life Balance Tracker collects **no data whatsoever**.

- ❌ No telemetry
- ❌ No cloud sync
- ❌ No analytics
- ❌ No external connections of any kind
- ✅ Everything stays on your device

The file you download is the file you use. Your entries, scores, and personal reflections never leave your computer unless you explicitly share the file with someone.

---

## Macro Safety

The Life Balance Tracker **does not contain any macros or VBA code**.  
It is safe to open without enabling macros.  
If Excel prompts you to enable macros when opening this file, do not enable them — this may indicate the file has been tampered with. Download a fresh copy from this repository.

---

## Backup Recommendation

Since all your data lives locally in the Excel file, we strongly recommend:

- Keeping a **regular backup** of your filled-in tracker (weekly or monthly)
- Storing backups in a secure location (local drive, personal cloud storage, or encrypted backup)
- Not sharing your personal filled-in version publicly

---

## Reporting a Security Concern

If you discover a potential security issue — such as unexpected behavior, hidden content, or anything that seems unusual — please **do not open a public Issue**.

Instead, report it privately via [LinkedIn](https://www.linkedin.com/in/guido-matteo-cavicchioli-743089204) with:

1. A clear description of the concern
2. Steps to reproduce it if applicable
3. The version of the file you are using
4. Your Excel version and operating system

All reports will be reviewed promptly and handled with discretion.

---

## Third-Party Dependencies

The Excel file has no external dependencies.



---

*Last updated: March 2026*
