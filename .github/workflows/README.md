# CI/CD Pipeline Documentation

## Overview

This repository uses GitHub Actions for continuous integration and deployment. The pipeline is designed to ensure code quality, security, and functionality of the Fintech Automation Framework.

## Workflow: Fintech API Check

### Triggers

- **Push**: Main and develop branches
- **Pull Request**: Main branch
- **Schedule**: Daily at 6 AM UTC

### Jobs

#### 1. API Tests & Security Validation
- **Matrix**: Tests on Node.js 18.x and 20.x
- **Steps**:
  - Install dependencies and Playwright browsers
  - Create .env from GitHub Secrets
  - Run API tests with multiple reporters
  - Upload artifacts on failure

#### 2. Security & Infrastructure ID Validation
- **Purpose**: Verify security masking and infrastructure ID protection
- **Steps**:
  - Run security tests
  - Verify CLIENT_ID masking functionality
  - Check for hardcoded sensitive data

#### 3. Localization & Currency Tests
- **Purpose**: Validate currency formatting and internationalization
- **Steps**:
  - Run transaction tests
  - Test currency formatting for USD/EUR
  - Verify date formatting by currency

#### 4. Code Quality & Linting
- **Purpose**: Ensure code quality and security
- **Steps**:
  - TypeScript compilation check
  - Scan for hardcoded passwords
  - Check for unmasked infrastructure IDs

#### 5. Notification
- **Purpose**: Provide pipeline status summary
- **Steps**:
  - Success notification if all jobs pass
  - Failure notification with job status details

## Required GitHub Secrets

To use this CI/CD pipeline, you must configure the following secrets in your GitHub repository:

### Environment Variables
- `FINTECH_USERNAME`: Fintech application username
- `FINTECH_PASSWORD`: Fintech application password
- `CLIENT_ID`: Infrastructure client ID (will be masked)
- `DISCOVERY_ID`: Infrastructure discovery ID (will be masked)
- `MFA_SECRET`: Multi-factor authentication secret
- `DEFAULT_CURRENCY`: Default currency (optional, defaults to USD)
- `BASE_URL`: Base URL for API testing (optional, defaults to demo.fintech.com)

### How to Set Up Secrets

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add each required secret with the exact name

## Artifacts

The pipeline generates the following artifacts:

### Test Results (7-day retention)
- `playwright-report-{node-version}`: HTML report (uploaded on failure)
- `test-results-{node-version}`: Raw test results
- `junit-results-{node-version}`: JUnit XML format results

## Security Features

### Infrastructure ID Masking
- CLIENT_ID and DISCOVERY_ID are automatically masked in logs
- Pipeline verifies masking functionality works correctly
- Prevents sensitive infrastructure identifiers from exposure

### Code Quality Checks
- Scans for hardcoded passwords and secrets
- Detects unmasked infrastructure IDs in source code
- TypeScript compilation validation

### Environment Security
- Uses GitHub Secrets for all sensitive data
- .env file created securely during pipeline execution
- No secrets stored in repository

## Monitoring

### CI/CD Status Badge
The README.md includes a status badge showing the current pipeline status:
```
![CI/CD Status](https://github.com/Sindhuja-janardhanan-QA/fintech-automation-framework/workflows/Fintech%20API%20Check/badge.svg)
```

### Notifications
- Success: All tests pass
- Failure: Detailed breakdown of which jobs failed
- Artifacts available for debugging failed runs

## Troubleshooting

### Common Issues

1. **Secrets Not Found**: Ensure all required GitHub Secrets are configured
2. **Browser Installation Failures**: Playwright browsers are installed automatically
3. **API Test Failures**: Check demo.fintech.com availability and BASE_URL configuration
4. **Masking Test Failures**: Verify CLIENT_ID follows expected pattern

### Debugging Failed Runs

1. Download artifacts from the failed run
2. Check Playwright HTML report for detailed test failures
3. Review test-results directory for raw output
4. Check job logs for specific error messages

## Best Practices

### Security
- Never commit .env files to the repository
- Use GitHub Secrets for all sensitive data
- Regularly rotate secrets and tokens
- Review pipeline logs for potential data exposure

### Performance
- Use matrix strategy for multiple Node.js versions
- Cache npm dependencies for faster builds
- Limit artifact retention to 7 days

### Maintenance
- Update Node.js versions in matrix as needed
- Review and update security scanning rules
- Monitor pipeline performance and optimize as needed
