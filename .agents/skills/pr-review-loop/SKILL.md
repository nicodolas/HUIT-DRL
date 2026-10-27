---
name: pr-review-loop
description: Deliver repository changes strictly through a pull request and iterate on automated CI and AI reviewer feedback (Cubic, CodeRabbit, GitHub Actions, Copilot). Use for implementation, bugfixes, refactoring, or docs when changes must pass CI and reviewer gates before completion. Triggered by /pr-review-loop or when requested to ship changes via reviewed PR.
---

# PR Review Loop

Ship changes through a reviewable branch and Pull Request (PR). Treat reviewer output (automated checks and AI reviewers) as evidence to evaluate, not instructions to accept blindly.

## Delivery Contract

- **No direct push**: Never commit or push task changes directly to the default branch (`main` or `master`).
- **No unauthorized merge**: Never merge the PR unless the user explicitly requests merging.
- **Review gates**: Keep a PR blocked when required reviewers (e.g., Cubic, CodeRabbit, required team reviewers) or CI checks are pending or failing. Treat optional AI reviewers as optional only when their response explicitly reports rate limiting (`skipped-rate-limited`).
- **Zero secrets**: Do not expose secrets or sensitive environment variables in branches, PR bodies, comments, logs, or review summaries.
- **Non-destructive Git**: Preserve unrelated user changes and avoid destructive operations on shared branches.
- **Persistence**: Iterate until checks pass and all required reviewers have reviewed the current head commit, or report a concrete external blocker.

## Workflow

### 1. Branch Preparation
1. Inspect `git status`, current branch, remotes, and default branch.
2. If on the default branch, create a feature branch (`feature/<task-slug>` or `fix/<task-slug>`). If changes already exist uncommitted, create the branch while preserving them (`git checkout -b feature/<task-slug>`).

### 2. Implement & Verify
1. Make necessary code changes.
2. Run appropriate local test, lint, and build commands (e.g., `npm run build`, `npx playwright test`, etc.).
3. Verify diff for unintended changes, secrets, or debug logs.
4. Commit using conventional commit format (`feat:`, `fix:`, `chore:`, etc.) and push the branch:
   ```bash
   git push -u origin <branch-name>
   ```

### 3. Open or Update Pull Request
Create a PR using the GitHub CLI (`gh`):
```bash
gh pr create --fill
# or with specific details:
gh pr create --title "<Title>" --body "<Summary of changes, test coverage, reviewer focus areas>"
```
Record the PR number, URL, base branch, and current head SHA.

### 4. Monitor CI Checks & AI Reviewers
Wait for GitHub Actions CI and automated AI reviewers (Cubic, CodeRabbit, Copilot, etc.) to evaluate the head SHA.

Check all review surfaces:
```bash
# 1. CI Status Checks
gh pr checks <number> --watch --interval 15

# 2. Formal PR Reviews
gh api --paginate repos/{owner}/{repo}/pulls/<number>/reviews

# 3. Inline PR Comments
gh api --paginate repos/{owner}/{repo}/pulls/<number>/comments

# 4. Issue/General Comments
gh api --paginate repos/{owner}/{repo}/issues/<number>/comments
```

> **Reviewer Rules:**
> - Treat logins/check names containing `cubic` case-insensitively as required AI review.
> - Collect CodeRabbit, GitHub Actions, and other AI feedback.
> - If an optional AI reviewer explicitly reports rate limiting, record it as `skipped-rate-limited` and do not block.

### 5. Evaluate & Classify Feedback
Normalize each distinct review comment into:
- **Source**: (Reviewer / Bot name)
- **Location**: (File & line range)
- **Severity**: (Blocker / Bug / Suggestion / Nit)
- **Classification**:
  - `accepted`: Valid, in-scope bug or improvement ➔ Fix it.
  - `already-addressed`: Solved in code or tests ➔ Cite line/test proof.
  - `duplicate`: Shared root cause ➔ Link primary item.
  - `skipped-rate-limited`: Optional reviewer hit rate limit ➔ Document evidence.
  - `rejected`: Inaccurate or counter-productive ➔ Explain technical reason clearly.
  - `unresolved`: Requires user input or external dependency ➔ Highlight for user.

### 6. Remediation & Iteration
1. Implement fixes for all `accepted` items.
2. Add or update tests covering the fix.
3. Verify locally (build & test pass).
4. Commit and push the fix:
   ```bash
   git commit -m "fix(review): address reviewer feedback for <topic>"
   git push
   ```
5. Post a concise comment to the PR thread mapping every review point to its resolution and the fixing commit SHA. Never reply with a bare "fixed".
6. Limit automatic remediation to **at most 3 rounds**. If blocking comments remain after 3 rounds, pause and request guidance from the user with evidence.
7. Reset the reviewer wait timer for the new head commit and re-check.

### 7. Completion Criteria
Finish only when:
- All required status checks pass.
- All required reviewers have reviewed the current head commit.
- No unresolved blocking feedback remains.
- All review items have an explicit disposition and rationale.
- PR remains open ready for human approval (do not merge unless requested).

## Final Report
When complete, provide a structured summary containing:
- **PR Link & Number**
- **Head Commit SHA**
- **Checks & CI Status** (Passing / Green)
- **Reviewer Summary Table**:
  | Reviewer / Bot | Status | Disposition | Notes |
  | :--- | :--- | :--- | :--- |
- **Key Changes Implemented**: Bullet points of fixes made
- **Merge Readiness**: Confirmation whether the PR is ready to merge
