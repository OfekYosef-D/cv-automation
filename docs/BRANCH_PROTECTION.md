# Branch Protection

Configure GitHub branch protection to enforce CI before merge.

## Recommended Settings

1. **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern**: `main` (or `master`)
3. Enable:
   - **Require a pull request before merging**
   - **Require status checks to pass** → select `build` (from CI workflow)
   - **Require branches to be up to date before merging**
4. Optionally: **Require conversation resolution before merging**

## CI Workflow

Ensure `.github/workflows/ci.yml` runs on PRs. Status checks will appear after the first run.
