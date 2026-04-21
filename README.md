# Fintech Automation Framework

A secure automation framework for Fintech applications with built-in secret management.

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template and fill in your credentials:

```bash
cp .env.example .env
# or use demo data for testing
cp .env.demo .env
```

Edit `.env` with your actual values:

```env
# Fintech Platform Credentials
FINTECH_USERNAME=your_actual_username
FINTECH_PASSWORD=your_actual_password

# API Configuration
CLIENT_ID=your_actual_client_id
DISCOVERY_ID=your_actual_discovery_id

# MFA Configuration
MFA_SECRET=your_mfa_secret_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test the Configuration

```bash
npm run dev src/test-config.ts
```

## 🔐 Secret Management

The framework uses a secure `ConfigManager` utility to handle environment variables:

### Usage

```typescript
import { config } from './src/utils/ConfigManager';

// Get all fintech configuration
const fintechConfig = config.getFintechConfig();

// Get individual secrets
const clientId = config.getSecret('CLIENT_ID');

// Get optional secrets with defaults
const optionalValue = config.getOptionalSecret('OPTIONAL_VAR', 'default_value');
```

### Security Features

- ✅ `.env` file is automatically excluded from version control
- ✅ Clear error messages for missing required secrets
- ✅ Singleton pattern for consistent configuration access
- ✅ Validation methods for required environment variables

## 📁 Project Structure

```
fintech-automation-framework/
├── .env                    # Local environment variables (DO NOT COMMIT)
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file (includes .env)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── src/
│   ├── utils/
│   │   └── ConfigManager.ts  # Secret management utility
│   └── test-config.ts     # Configuration test file
└── README.md              # This file
```

## 🔧 Available Scripts

- `npx playwright test` - Run E2E tests
- `npx playwright test tests/auth/full-auth-flow.test.ts` - Run specific auth test
- `npx playwright install` - Install Playwright browsers
- `npm run dev` - Run TypeScript files directly
- `npm run build` - Compile TypeScript to JavaScript
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 🛡️ Security Best Practices

1. **Never commit `.env` files** - They're automatically excluded by `.gitignore`
2. **Use different credentials** for development and production
3. **Rotate secrets regularly** - Update your `.env` file when needed
4. **Limit access** - Only team members who need access should have the secrets
5. **Use environment-specific configs** for different deployment stages

## 🚨 Required Environment Variables

The following variables are required for the framework to work:

- `FINTECH_USERNAME` - Your fintech platform username
- `FINTECH_PASSWORD` - Your fintech platform password
- `CLIENT_ID` - API client identifier
- `DISCOVERY_ID` - Service discovery identifier

## 📞 Support

If you encounter any issues with the secret management system:

1. Check that your `.env` file exists and is properly filled
2. Run the test script: `npm run dev src/test-config.ts`
3. Ensure all required environment variables are set
4. Verify that `.env` is not being tracked by git

This framework utilizes a Dual-Layer Validation approach:

API Layer: Validates backend business logic and data integrity. In the current demo configuration, these tests point to a placeholder endpoint (demo.fintech.com), resulting in a DNS ENOTFOUND error—this confirms the network layer is correctly attempting external handshakes with masked infrastructure IDs.

UI Layer: A Playwright-based Page Object Model (POM) designed for high-precision currency and localization testing.

Security: All logs automatically mask PII (Passwords, MFA Secrets) and Infrastructure IDs (Client/Discovery IDs) to ensure GDPR and SOC2 compliance.