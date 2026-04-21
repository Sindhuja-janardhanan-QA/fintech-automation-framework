# Azure DevOps Pipeline Documentation

## Overview

This repository uses Azure DevOps Pipelines for continuous integration and deployment. The pipeline is designed to ensure code quality, security, and functionality of the Fintech Automation Framework.

## Pipeline: Fintech API Check

### Triggers

- **Branch Triggers**: Main and develop branches
- **Pull Requests**: Main branch
- **Scheduled**: Daily at 6 AM UTC
- **Tags**: All tags

### Stages

#### Stage 1: Build and Test

##### Job 1: API Tests & Security Validation
- **Strategy**: Matrix testing on Node.js 18.x and 20.x
- **Steps**:
  - Install Node.js and dependencies
  - Install Playwright browsers
  - Create .env from Azure DevOps variables
  - Validate environment configuration
  - Run API tests with multiple reporters
  - Upload artifacts on failure

##### Job 2: Security & Infrastructure ID Validation
- **Purpose**: Verify security masking and infrastructure ID protection
- **Steps**:
  - Run security tests
  - Verify CLIENT_ID masking functionality
  - Check for hardcoded sensitive data

##### Job 3: Localization & Currency Tests
- **Purpose**: Validate currency formatting and internationalization
- **Steps**:
  - Run transaction tests
  - Test currency formatting for USD/EUR
  - Verify date formatting by currency

##### Job 4: Code Quality & Linting
- **Purpose**: Ensure code quality and security
- **Steps**:
  - TypeScript compilation check
  - Scan for hardcoded passwords
  - Check for unmasked infrastructure IDs

#### Stage 2: Notification
- **Purpose**: Provide pipeline status summary
- **Steps**:
  - Success notification if all jobs pass
  - Failure notification with job status details

## Required Azure DevOps Variables

To use this pipeline, you must configure the following variables in your Azure DevOps project:

### Environment Variables (Secret Variables)
- `FINTECH_USERNAME`: Fintech application username
- `FINTECH_PASSWORD`: Fintech application password
- `CLIENT_ID`: Infrastructure client ID (will be masked)
- `DISCOVERY_ID`: Infrastructure discovery ID (will be masked)
- `MFA_SECRET`: Multi-factor authentication secret
- `DEFAULT_CURRENCY`: Default currency (optional, defaults to USD)
- `BASE_URL`: Base URL for API testing (optional, defaults to demo.fintech.com)

### How to Set Up Variables

1. Go to your Azure DevOps project
2. Navigate to **Pipelines** > **Library**
3. Click **+ Variable group**
4. Add each required variable with the exact name
5. Mark sensitive variables as **secret** (passwords, tokens, IDs)

## Artifacts

The pipeline generates the following artifacts:

### Test Results
- `playwright-report-{nodeVersion}`: HTML report (uploaded on failure)
- `test-results-{nodeVersion}`: Raw test results
- `JUnit Results`: Published as test results for Azure DevOps

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
- Uses Azure DevOps secret variables for all sensitive data
- .env file created securely during pipeline execution
- No secrets stored in repository

## Monitoring

### CI/CD Status Badge
The README.md includes a status badge showing the current pipeline status:
```
![Azure DevOps Build Status](https://dev.azure.com/your-organization/your-project/_apis/build/status/your-build-definition?branchName=main)
```

### Notifications
- Success: All tests pass
- Failure: Detailed breakdown of which jobs failed
- Artifacts available for debugging failed runs

## Troubleshooting

### Common Issues

1. **Variables Not Found**: Ensure all required Azure DevOps variables are configured in the variable group
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
- Use Azure DevOps secret variables for all sensitive data
- Regularly rotate secrets and tokens
- Review pipeline logs for potential data exposure

### Performance
- Use matrix strategy for multiple Node.js versions
- Cache npm dependencies for faster builds
- Limit artifact retention as needed

### Maintenance
- Update Node.js versions in matrix as needed
- Review and update security scanning rules
- Monitor pipeline performance and optimize as needed

## Integration with Azure DevOps

### Repository Connection
- This pipeline works with both GitHub and Azure Repos
- Ensure proper service connections are configured
- Use appropriate triggers based on your repository type

### Build Numbering
- Azure DevOps automatically handles build numbering
- Build numbers are included in artifact names
- Use semantic versioning for releases

### Releases
- Pipeline can be extended with deployment stages
- Use Azure DevOps Releases for production deployments
- Configure approval gates for critical deployments
