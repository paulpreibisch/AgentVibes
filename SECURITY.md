# Security Policy

## Supported Versions

We actively support the following versions of AgentVibes with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |
| < 1.0   | :x:                |

We recommend always using the latest version to ensure you have the most recent security patches and features.

## Security Scanning

AgentVibes uses automated security scanning to identify and address vulnerabilities:

- **SonarCloud**: Continuous code quality and security analysis
  - View reports: https://sonarcloud.io/project/overview?id=paulpreibisch_AgentVibes
- **GitHub CodeQL**: Advanced semantic code analysis for security vulnerabilities
  - View alerts: https://github.com/paulpreibisch/AgentVibes/security/code-scanning

All security hotspots and alerts are addressed before each release.

## Reporting a Vulnerability

We take security seriously and appreciate your help in keeping AgentVibes safe for everyone.

### How to Report

If you discover a security vulnerability, please report it by:

1. **Email**: Send details to [paul@agentvibes.org](mailto:paul@agentvibes.org)
2. **GitHub Security Advisory**: Use [GitHub's private vulnerability reporting](https://github.com/paulpreibisch/AgentVibes/security/advisories/new)

### What to Include

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Updates**: Every 7 days until the issue is resolved
- **Resolution**: We aim to release a patch within 30 days for critical vulnerabilities

### What to Expect

**If the vulnerability is accepted:**
- We will work on a fix and keep you informed of progress
- You will be credited in the release notes (unless you prefer to remain anonymous)
- We will coordinate disclosure timing with you
- A CVE will be requested if applicable

**If the vulnerability is declined:**
- We will explain why we don't consider it a security issue
- We may still address it as a bug or feature request
- You will receive a detailed explanation of our decision

## Security Best Practices

When using AgentVibes:

1. **Keep Updated**: Always use the latest version
2. **Review Permissions**: Understand what file access AgentVibes requires
3. **Environment Variables**: Never commit API keys or credentials to version control
4. **Audit Dependencies**: We regularly update dependencies to patch known vulnerabilities
5. **Report Issues**: If you see something suspicious, report it

## Disclosure Policy

- We follow responsible disclosure practices
- Security fixes are prioritized over feature development
- We will publicly disclose vulnerabilities only after a patch is available
- Critical vulnerabilities may result in an emergency release

## Contact

For security concerns, contact:
- Email: paul@agentvibes.org
- Website: https://agentvibes.org

Thank you for helping keep AgentVibes secure!
