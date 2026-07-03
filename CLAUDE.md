# CLAUDE.md

Project-specific instructions for Claude Code when working in this repository.

## Git Workflow

Never commit directly to `main`. For every piece of work that results in a commit:

1. **Create a new branch** off `main` before making changes (e.g. `feat/issue-5-seed-data`, `fix/short-description`). Name it after the GitHub issue when one exists (`feat/issue-<n>-<slug>`).
2. **Commit** the work on that branch.
3. **Push the branch and open a PR** into `main` (`gh pr create`).
4. **Merge the PR** into `main`.
5. **If the work closes a GitHub issue**, reference it in the PR body with a closing keyword (e.g. `Closes #5`) so merging the PR automatically closes the issue. If no issue is involved, skip this step.

Do not squash this into a direct commit on `main`, and do not skip the branch/PR step even for small changes — every commit in this repo goes through a branch + PR + merge cycle.
