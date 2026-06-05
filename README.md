# KeyVora — Secure Password Manager

> Secure password manager using Fernet encryption, PBKDF2 key derivation, Google OAuth, and TOTP 2FA.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Security Features](#security-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Security Architecture](#security-architecture)
- [Authentication Flows](#authentication-flows)
- [Rate Limiting](#rate-limiting)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Overview

KeyVora is a cybersecurity-first password manager built with Flask. Credentials are encrypted at rest using a vault-key architecture — every password is wrapped by a unique Fernet key that is itself derived from your master password via PBKDF2-HMAC-SHA256 with 390,000 iterations. The server cannot read stored credentials at rest; the database holds only opaque ciphertext.

The project was built as a full-stack learning exercise that covers real-world web security: symmetric encryption, key stretching, server-side vault key management, OAuth 2.0, TOTP 2FA, rate limiting, and secure session handling.

---

## Live Demo

> _Coming soon — deployment in progress._

---

## Features

### Authentication
- Email/password registration and login
- Google OAuth 2.0 login via Authlib
- TOTP two-factor authentication (Google Authenticator, Authy, etc.)
- QR code generation for authenticator app setup
- 8 single-use backup codes generated at 2FA enrolment (bcrypt-hashed)
- Email OTP-based password reset (6-digit code, expiry-controlled)

### Vault & Password Management
- Notebook-based organisation — group credentials by context (Work, Personal, Finance, etc.)
- Each entry stores: title, username, encrypted password, URL, and notes
- Vault lock/unlock mechanism with a configurable auto-lock timeout (default: 15 minutes)
- Live countdown timer on the dashboard showing time until auto-lock
- Vault key held in server-side session memory; wiped on lock or session expiry
- Instant search across all notebooks by title, username, or URL

### Multi-Account Sessions
- Sign in to multiple KeyVora accounts simultaneously
- Switch between accounts with one click
- Each account maintains its own independent vault key and lock state

### Data Portability
- Full vault export as a JSON file at any time
- No subscription required to export

---

## Tech Stack

| Layer             | Technology                                         |
|-------------------|----------------------------------------------------|
| Backend Framework | Flask 3.x                                          |
| ORM               | Flask-SQLAlchemy, Flask-Migrate (Alembic)          |
| Database          | SQLite (development), PostgreSQL (production)      |
| Encryption        | `cryptography` — Fernet (AES-128-CBC + HMAC-SHA256), PBKDF2HMAC |
| Password Hashing  | Flask-Bcrypt                                       |
| Auth              | Flask-Login, Authlib (Google OAuth 2.0)            |
| 2FA               | PyOTP, `qrcode`                                    |
| Email             | Flask-Mail (SMTP / Gmail App Password)             |
| Rate Limiting     | Flask-Limiter                                      |
| WSGI Server       | Gunicorn                                           |
| Frontend          | HTML, CSS, JavaScript (Jinja2 templates)           |
| Fonts             | Sora, Inter, DM Mono (Google Fonts)                |

---

## Project Structure

```text
KeyVora/
├── app.py                      # Main application — routes, models, auth, encryption
├── requirements.txt            # Python dependencies
├── Procfile                    # Gunicorn entry point for cloud deployment
├── .env                        # Environment variables (never commit)
├── .gitignore
├── keyvora.db                  # SQLite database (development only)
│
├── migrations/                 # Alembic database migration scripts
│   ├── env.py
│   ├── script.py.mako
│   ├── alembic.ini
│   └── versions/
│       ├── 506eca5ca91d_initial_clean.py
│       └── 31999aef81b3_add_2fa_field.py
│
├── static/
│   ├── css/
│   │   ├── 2fa.css             # 2FA page styles
│   │   ├── main.css            # Global styles, design tokens
│   │   └── profile_styles.css  # Profile / settings page styles
│   │
│   └── js/
│       ├── 2fa.js              # 2FA page interactions
│       ├── dashboard.js        # Vault UI — notebooks, search, entries
│       ├── main.js             # Shared utilities, vault timer
│       ├── profile.js          # Profile page interactions
│       └── terms.js            # Terms & Conditions page interactions
│
└── templates/
    ├── base.html               # Shared base layout (nav, session, headers)
    ├── index.html              # Landing / marketing page
    ├── login.html              # Login form (password + Google OAuth)
    ├── register.html           # Registration form
    ├── dashboard.html          # Main vault UI (notebooks + entries)
    ├── profile.html            # Account settings, 2FA management
    ├── 2fa.html                # TOTP verification step
    ├── forgot_password.html    # OTP-based password reset flow
    └── terms.html              # Terms & Conditions and Privacy Policy
```

## Security Architecture

> **Threat model note:** The vault key is temporarily held in the server-side session while the vault is unlocked. The server cannot read credentials at rest, but does hold the decryption key in memory during an active unlock window. This is a **server-assisted encryption model**, not a fully client-side zero-knowledge architecture.

### Vault Key Encryption Model

Each user gets a unique Fernet key (the **vault key**) generated at registration. It is never stored in plaintext. Fernet uses AES-128-CBC with HMAC-SHA256 for authenticated encryption.

```
Master Password + Random Salt
        │
        ▼  PBKDF2-HMAC-SHA256 (390,000 iterations)
  Key Encryption Key (KEK)
        │
        ▼  Fernet.encrypt(vault_key)
  encrypted_vault_key  ← stored in database
```

On login:
1. User provides their master password.
2. The KEK is re-derived from the master password and the stored salt.
3. The vault key is decrypted and held **in the server-side session** for the duration of the unlock window. The server can decrypt entries while the vault is unlocked.
4. After the timeout, the vault key is wiped from session memory; all vault operations require re-entry of the master password.

### Password Entry Encryption

Every password field is individually encrypted with the vault key:

```
Plaintext Password  →  Fernet(vault_key).encrypt()  →  Ciphertext stored in DB
```

Decryption is only possible when the vault is unlocked and the vault key is present in the session.

### Google OAuth Escrow

Google OAuth users do not have a master password by default. When they later set one via their profile, a server-side **escrow copy** of their vault key is maintained. The escrow key is encrypted using a KEK derived from the application's `SECRET_KEY` and the user's unique salt — enabling the OTP reset flow to re-wrap the vault key under the new master password without exposing it.

### Security Headers

Every response includes:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

Session cookies are set with `HttpOnly`, `SameSite=Lax`, and `Secure` (production only).

### Bcrypt Login Credential Hashing

The login password (separate from the master password) is hashed with Flask-Bcrypt. Even in the event of a full database compromise, login credentials remain protected against high-speed cracking hardware.

---

## Authentication Flows

### Standard Login

```
User → Email + Master Password
     → bcrypt verifies login hash
     → PBKDF2 derives KEK
     → vault key decrypted → stored in session
     → (if TOTP enabled) → temp session key held → TOTP verified → session finalised
     → Dashboard
```

### Google OAuth Login

```
User → "Sign in with Google"
     → Google authorization endpoint
     → Callback: Google ID + email matched or new account created
     → (if TOTP enabled) → 2FA challenge presented
     → Session created (no vault key until master password is set)
     → Dashboard
```

### TOTP Two-Factor Authentication

- Codes verified against the stored base32 secret with a ±1 step tolerance window.
- Backup codes are single-use, stored as bcrypt hashes, consumed and permanently deleted on use (prevents replay attacks).

### Password Reset (OTP Flow)

```
User → Forgot Password → Email submitted
     → 6-digit OTP generated and emailed (expiry: 10 minutes)
     → User enters OTP + new master password
     → Server re-derives KEK → re-wraps vault key under new master password
     → Old OTP invalidated
     → User redirected to login
```

---

## Rate Limiting

Flask-Limiter enforces the following limits per IP address:

| Endpoint              | Limit                  |
|-----------------------|------------------------|
| Login                 | 20 requests / minute   |
| Registration          | 10 requests / hour     |
| Password reset        | 5 requests / hour      |
| Vault unlock          | 10 requests / minute   |

Exceeding any limit returns an HTTP 429 with a clear retry message.

---

## Installation

### Prerequisites

- Python 3.10 or higher
- pip
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) enabled (for email OTP)
- A Google Cloud project with OAuth 2.0 credentials configured (for Google login)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/VGManasa/KeyVora.git
cd KeyVora

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ── Core ──────────────────────────────────────────
SECRET_KEY=your_very_long_random_secret_key_here

# ── Database ──────────────────────────────────────
# Leave as SQLite for local development
DATABASE_URL=sqlite:///keyvora.db
# PostgreSQL for production:
# DATABASE_URL=postgresql://user:password@host:5432/dbname

# ── Google OAuth 2.0 ──────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ── Email (Flask-Mail / Gmail SMTP) ───────────────
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_16_character_app_password

# ── Vault ─────────────────────────────────────────
# Auto-lock timeout in seconds (default: 900 = 15 minutes)
VAULT_LOCK_TIMEOUT=900

# ── Flask ─────────────────────────────────────────
FLASK_ENV=development      # Set to 'production' when deploying
```

> **Never commit your `.env` file.** It is already listed in `.gitignore`.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application type).
3. Add `http://127.0.0.1:5000/auth/google/callback` to **Authorised Redirect URIs** (development).
4. Add your production callback URL when deploying.
5. Copy the Client ID and Client Secret into your `.env`.

---

## Database Setup

```bash
# Initialise migration environment (first time only, already committed)
flask db init

# Apply all migrations to create the schema
flask db upgrade
```

If you modify models in `app.py`, generate and apply a new migration:

```bash
flask db migrate -m "describe your change here"
flask db upgrade
```

---

## Running the Application

```bash
# Activate your virtual environment first
source venv/bin/activate

# Run the development server
flask run
```

The app will be available at `http://127.0.0.1:5000`.

To run on a different port:

```bash
flask run --port 8000
```

---

## Deployment

KeyVora includes a `Procfile` for one-click deployment on Render or Railway.

```
web: gunicorn app:app
```

### Render / Railway

1. Push your repository to GitHub.
2. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app) and connect the repo.
3. Set all environment variables from the `.env` section above in the platform's dashboard.
4. Set `FLASK_ENV=production`.
5. Provide a `DATABASE_URL` pointing to a PostgreSQL instance (both platforms offer managed Postgres add-ons).

### Production Notes

- The application automatically converts `postgres://` to `postgresql://` (required by SQLAlchemy 1.4+).
- `ProxyFix` middleware is included to correctly handle HTTPS headers and generate absolute callback URLs behind a reverse proxy.
- Session cookies are automatically promoted to `Secure` when `FLASK_ENV=production`.
- Run `flask db upgrade` once after initial deployment to initialise the production schema.

---

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main`

Please keep PRs focused and include a clear description of what was changed and why.

---

## License

This project is built for educational and learning purposes. Feel free to study, fork, and adapt it — attribution appreciated.

---

## Author

**Manasa V G**  
[GitHub @VGManasa](https://github.com/VGManasa)

---

_Built with Flask, secured with Fernet encryption and PBKDF2 key derivation, and designed around a single principle: your passwords belong to you._
