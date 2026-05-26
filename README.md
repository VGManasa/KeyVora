# VaultKey

VaultKey is a Flask-based secure password manager built with a focus on cybersecurity-first design. It provides encrypted credential storage, multi-factor authentication, and secure session handling through a web interface.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Security Architecture](#security-architecture)
- [Authentication Flows](#authentication-flows)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)

---

## Overview

VaultKey allows users to securely store, organize, and retrieve passwords. Credentials are encrypted at rest using a vault-key architecture where each user's data is protected by a unique vault key derived from their master password. The application is designed to run both locally and on cloud platforms such as Render or Railway.

---

## Features

**Authentication**
- Username/password registration and login
- Google OAuth 2.0 login via Authlib
- Time-based One-Time Password (TOTP) two-factor authentication using PyOTP
- TOTP QR code generation for authenticator app setup
- Backup codes for 2FA recovery
- Email OTP-based password reset via Flask-Mail

**Vault and Password Management**
- Notebook-based organization of password entries (title, username, encrypted password, URL, notes)
- Vault lock and unlock mechanism with a configurable session timeout (default: 15 minutes)
- Vault key stored in session memory; cleared on lock or session expiry
- Multi-account session support (switch between logged-in accounts without re-authentication)

**Security**
- Passwords encrypted using Fernet symmetric encryption (AES-128-CBC)
- Vault key derived from master password using PBKDF2-HMAC-SHA256 (390,000 iterations)
- User passwords hashed with bcrypt via Flask-Bcrypt
- Server-side vault key escrow for Google OAuth users who set a master password later
- Rate limiting on authentication endpoints via Flask-Limiter
- Security headers on all responses: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`
- Secure, HttpOnly, SameSite session cookies

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Flask 3.x |
| ORM | Flask-SQLAlchemy, Flask-Migrate (Alembic) |
| Database | SQLite (development), PostgreSQL (production) |
| Encryption | cryptography (Fernet, PBKDF2HMAC) |
| Password Hashing | Flask-Bcrypt |
| Authentication | Flask-Login, Authlib (Google OAuth) |
| 2FA | PyOTP, qrcode |
| Email | Flask-Mail (SMTP/Gmail) |
| Rate Limiting | Flask-Limiter |
| WSGI Server | Gunicorn |
| Frontend | HTML, CSS, JavaScript (Jinja2 templates) |

---

## Project Structure

```
Vaultkey/
├── app.py                  # Main application: routes, models, auth logic, encryption
├── requirements.txt        # Python dependencies
├── Procfile                # Gunicorn process definition for deployment
├── .gitignore
├── migrations/             # Alembic database migration scripts
├── static/                 # CSS, JavaScript, and static assets
└── templates/              # Jinja2 HTML templates
    ├── index.html
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── profile.html
    ├── 2fa.html
    └── forgot_password.html
```

---

## Security Architecture

**Vault Key Encryption Model**

Each user has a unique vault key (Fernet key) generated at registration. This vault key is never stored in plaintext. Instead:

1. A Key Encryption Key (KEK) is derived from the user's master password and a random salt using PBKDF2-HMAC-SHA256 with 390,000 iterations.
2. The vault key is encrypted with the KEK and stored in the database (`encrypted_vault_key`).
3. On login, the vault key is decrypted using the provided master password and held in the server-side session for the duration of the vault unlock window.
4. After the lock timeout expires or the user manually locks the vault, the vault key is removed from the session and all password operations require re-entry of the master password.

**Escrow Vault Key**

For accounts that use Google OAuth and later set a master password, a server-side escrow copy of the vault key is maintained. This escrow is encrypted using a key derived from the application's `SECRET_KEY` and the user's salt, enabling recovery flows without exposing the vault key in plaintext.

**Password Entry Encryption**

Each password entry's value is encrypted using the user's vault key (Fernet). Decryption is only possible when the vault is unlocked and the vault key is present in the session.

---

## Authentication Flows

**Standard Login**
1. User submits username/email and master password.
2. bcrypt verifies the password hash.
3. PBKDF2 derives the KEK; the vault key is decrypted and stored in the session.
4. If TOTP is enabled, the vault key is held in a temporary session key until 2FA is verified.

**Google OAuth Login**
1. User is redirected to Google's authorization endpoint.
2. On return, the user's Google ID and email are matched against existing accounts or a new account is created.
3. If TOTP is enabled on the account, the 2FA challenge is presented before session creation.
4. Google users do not have a vault key until they set a master password via their profile.

**Two-Factor Authentication**
- TOTP codes are verified against a stored base32 secret using a valid window of ±1 step.
- Backup codes are single-use, stored as bcrypt hashes, and consumed on successful verification.

**Password Reset**
- A 6-character OTP is generated and sent to the user's registered email via SMTP.
- The OTP is stored in the database with an expiry timestamp and invalidated after use.

---

## Installation

**Prerequisites**
- Python 3.10 or higher
- pip

**Steps**

```bash
# Clone the repository
git clone https://github.com/VGManasa/Vaultkey.git
cd Vaultkey

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Required
SECRET_KEY=your_secret_key_here

# Database (optional; defaults to SQLite locally)
DATABASE_URL=sqlite:///vaultkey.db

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (SMTP)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# Vault lock timeout in seconds (default: 900)
VAULT_LOCK_TIMEOUT=900

# Set to 'production' when deploying
FLASK_ENV=development
```

---

## Running the Application

```bash
# Initialise the database
flask db upgrade

# Start the development server
flask run
```

The application will be available at `http://127.0.0.1:5000`.

---

## Deployment

VaultKey includes a `Procfile` for deployment on platforms such as Render or Railway.

```
web: gunicorn app:app
```

**Production checklist:**
- Set `FLASK_ENV=production` in the platform's environment variables.
- Provide a `DATABASE_URL` pointing to a PostgreSQL instance. The application handles the `postgres://` to `postgresql://` scheme conversion automatically.
- Set all required environment variables listed above.
- The application uses `ProxyFix` middleware to correctly handle HTTPS and generate absolute URLs behind a reverse proxy.
- Session cookies are automatically set to `Secure` when `FLASK_ENV=production`.


## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

## License

This project is for educational and learning purposes.

---

## Author

Developed by Manasa V G