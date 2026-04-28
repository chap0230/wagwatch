# Security Policy

## Reporting a Vulnerability

If you've found a security issue in Wag Watch, please **do not** open a public
GitHub issue.

Instead, report it privately via
[GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
on this repository. That routes the report to the maintainers without exposing
details publicly.

We'll acknowledge receipt within a few days and keep you posted on remediation.

## Scope

In scope:
- The application code in `backend/`, `frontend/`, and `cdk/`
- The deploy scripts (`deploy.sh`, `destroy.sh`)
- Configuration defaults that would leave a fresh deploy insecure

Out of scope:
- Vulnerabilities in third-party dependencies that don't affect this app's
  specific usage. Please report those upstream first.
- Findings that require already-privileged AWS access to the deployed account.
- Denial-of-service via resource exhaustion from an authenticated user (the
  app has throttling and usage plans but is not hardened against a determined
  insider).

## Hardening Notes for Self-Hosters

This project is a small open-source app, not a managed service. If you deploy
it, the security of that deployment is your responsibility. A few things worth
reviewing before you expose it to other users:

- Restrict the S3 photos bucket CORS to your actual frontend domain (see
  `cdk/bin/cdk.ts`).
- Consider enabling optional MFA on the Cognito user pool.
- Consider adding AWS WAF in front of API Gateway if you expect abuse.
- Monitor the CloudWatch log groups — Lambda log retention is set to 30 days.
