---
name: pr-review-loop
description: Deliver repository changes strictly through a pull request and iterate on automated CI and multi-bot AI reviewer feedback (Cubic, Sourcery, CodeRabbit, GitHub Actions, CodeQL, SonarCloud). Use for implementation, bugfixes, refactoring, or docs when changes must pass CI and reviewer gates before completion. Triggered by /pr-review-loop or when requested to ship changes via reviewed PR.
---

# PR Review Loop

Ship changes through a reviewable branch and Pull Request (PR). Treat reviewer output (automated CI checks and multi-bot AI reviewers) as actionable evidence to evaluate, verify, and remediate iteratively.

---

## 🛡️ Delivery Contract

- **No direct push to protected branches**: Never commit or push changes directly to `main` or the repository's default branch.
- **No unauthorized merge**: Never merge the PR automatically unless the user explicitly requests merging.
- **Review gates & trust tiers**:
  - **Tier 1 (Primary / Required)**: `cubic` (trusted AI code reviewer for architecture, functional bugs, and edge cases). Must evaluate the latest head commit before completing unless explicitly configured otherwise.
  - **Tier 2 (Advisory / Quality & Security)**: `sourcery-ai`, `coderabbitai`, `github-actions[bot]`, `codeql`, `sonarcloud`. Evaluated for code quality, cleanliness, security, and refactoring insights.
- **Graceful skipping**: If a reviewer bot is skipping (e.g., markdown-only PRs), unconfigured, or rate-limited, record `skipped` with rationale and do not block the pipeline.
- **Zero secrets**: Never expose passwords, API tokens, or sensitive environment variables in commits, PR descriptions, comments, or review responses.
- **Non-destructive Git**: Preserve unrelated user changes and never use destructive Git operations on shared branches.
- **Bounded persistence**: Keep iterating until required checks pass and required reviewers have reviewed the current head commit, or report a concrete external blocker upon timeout.

---

## 🤖 Supported Bot Ecosystem & Setup Guide

The workflow integrates seamlessly with GitHub's leading **100% Free & Perpetual** review bots for public and open-source repositories:

| Bot / Integration | Role & Focus | Free Policy (Public Repos) | How to Activate |
| :--- | :--- | :--- | :--- |
| **Cubic** (`cubic · AI code reviewer`) | Primary AI code reviewer, PR summary, bug & logic detection | **100% Free** for public repos | GitHub App ([cubic.dev](https://www.cubic.dev)) |
| **Sourcery** (`sourcery-ai`) | Code quality, refactoring, complexity reduction, Python/TS best practices | **100% Free** for open-source | GitHub App ([sourcery.ai](https://sourcery.ai)) |
| **CodeRabbit** (`coderabbitai`) | Comprehensive AI summaries, sequence & flow diagrams, interactive inline chat | **100% Free** for open-source | GitHub App ([coderabbit.ai](https://coderabbit.ai)) |
| **GitHub CodeQL** | Native deep security analysis, OWASP Top 10, SQL injection, XSS, taint tracking | **100% Free & Built-in** to GitHub Actions | Repo `Security` tab ➔ `Code scanning` ➔ Enable |
| **SonarCloud** | Static analysis, Code Smells, Bugs, Security Hotspots, Quality Gate | **100% Free** for open-source | GitHub App ([sonarcloud.io](https://sonarcloud.io)) |
| **Super-Linter / MegaLinter** | Multi-language linting & formatting (TS, JS, CSS, JSON, Markdown) | **100% Free** (Open Source Action) | GitHub Actions workflow |

---

## 🔄 Workflow Steps

### Step 1: Branch Preparation & Remote Discovery
1. Inspect `git status`, current branch, remotes, and the default branch:
   ```bash
   git status
   git branch --show-current
   git remote -v
   ```
2. Determine the active writable remote (e.g., `origin` or upstream).
3. If on the default branch (`main`), create a descriptive feature branch:
   ```bash
   git checkout -b feature/<task-slug>
   # or fix/<task-slug>, refactor/<task-slug>
   ```
   *If uncommitted changes exist, keep them intact when creating the branch.*

---

### Step 2: Implement, Test & Verify Locally
1. Implement the requested feature or fix.
2. Run appropriate local verification (e.g., `npm run build`, `npm run test`, `npx playwright test`).
3. Audit diff for secrets, `.env` files, debug logs, or unrelated modifications:
   ```bash
   git diff
   ```
4. Commit using conventional commit format (`feat:`, `fix:`, `chore:`, `refactor:`):
   ```bash
   git add <files>
   git commit -m "feat(<scope>): <clear description>"
   ```
5. Push the branch to the discovered push remote:
   ```bash
   git push -u <remote> <branch-name>
   ```

---

### Step 3: Open or Reuse Pull Request (PR)
1. **Check for existing PR**: Verify whether a PR already exists for this branch:
   ```bash
   gh pr list --head <branch-name> --json number,url,state
   ```
2. **If an open PR exists**:
   - Reuse the existing PR number and URL.
   - Update PR body/title if scope has expanded: `gh pr edit <number> --body "..."`
3. **If no open PR exists**:
   - Create a new PR using GitHub CLI:
     ```bash
     gh pr create --title "<Title>" --body "<Summary of changes, test proof, areas for AI reviewer focus>"
     ```
4. Record the PR number, URL, base branch, and current head SHA:
   ```bash
   git rev-parse HEAD
   ```

---

### Step 4: Monitor CI Checks & Multi-Bot Reviews (Bounded Polling)
Wait for GitHub Actions CI and automated AI reviewers to evaluate the head SHA.

1. **Monitor CI Status Checks with Timeout (Max 15 minutes)**:
   ```bash
   gh pr checks <number> --watch --interval 15
   ```
   *If a check stays queued/pending past 15 minutes, report the stalled runner/check as an external blocker.*

2. **Collect Feedback across all 3 GitHub Review Surfaces**:
   ```bash
   # Surface A: Formal PR Reviews (Cubic, Sourcery, CodeRabbit, human reviewers)
   gh api --paginate repos/{owner}/{repo}/pulls/<number>/reviews

   # Surface B: Inline Diff Comments
   gh api --paginate repos/{owner}/{repo}/pulls/<number>/comments

   # Surface C: General PR & Issue Comments
   gh api --paginate repos/{owner}/{repo}/issues/<number>/comments
   ```

---

### Step 5: Classify & Prioritize Feedback
Normalize every distinct review item into:
- **Reviewer**: (e.g., `cubic`, `sourcery-ai`, `coderabbitai`, `github-actions[bot]`)
- **Location**: File path and line range
- **Severity**: Blocker / High / Medium / Suggestion / Nit
- **Classification**:
  - `accepted`: Valid bug, edge case, security flaw, or clear quality improvement ➔ Fix it.
  - `already-addressed`: Already solved in latest code or covered by tests ➔ Cite line/test proof.
  - `duplicate`: Shared root cause with another finding ➔ Link primary item.
  - `skipped-rate-limited`: Bot reached rate limit or is disabled ➔ Record check URL.
  - `rejected`: False positive, incorrect assumption, or counter-productive suggestion ➔ Document concrete technical rationale.
  - `unresolved`: Requires user decision or architectural clarification ➔ Escalate to user.

> **Trust Rules:**
> - **Cubic**: Primary gate. Blocking findings must be addressed or justified.
> - **Sourcery & CodeRabbit**: Advisory gates. Review suggestions carefully; accept high-value improvements and reject hallucinations with clear technical reasoning.

---

### Step 6: Remediation & Iteration Loop
1. Implement fixes for all `accepted` items.
2. Add or update unit/E2E tests to prevent regression.
3. Verify locally (build and tests pass cleanly).
4. Commit and push the fixes:
   ```bash
   git commit -m "fix(review): address reviewer feedback for <topic>"
   git push <remote> <branch-name>
   ```
5. Post a concise summary comment to the PR thread mapping every bot finding to its disposition and commit SHA:
   ```markdown
   ### AI Review Feedback Resolution
   - **[Cubic]** `<finding>` ➔ `accepted` (Fixed in commit `<SHA>`)
   - **[Sourcery]** `<finding>` ➔ `rejected` (Technical rationale: `<reason>`)
   ```
6. **Limit remediation to at most 3 cycles**: If blocking issues remain after 3 rounds, pause and request user guidance with evidence.
7. Re-monitor checks and reviewer responses on the new head SHA.

---

### Step 7: Completion Criteria
The workflow is complete only when:
- [x] All required CI checks (`Build & E2E Playwright Tests`, linting) are passing green.
- [x] Primary reviewer (`cubic`) has evaluated the current head commit.
- [x] All secondary bot comments (`sourcery`, `coderabbit`, etc.) have explicit dispositions (`accepted`, `rejected`, or `already-addressed`).
- [x] No unresolved blocking comments remain.
- [x] The PR remains open, ready for human review and final merge approval.

---

## 📊 Final Report Template
Upon completing the loop, return a structured markdown report:

```markdown
### 🚀 PR Review Loop Summary

- **Pull Request**: [#<number>](<PR_URL>)
- **Branch**: `<branch-name>` ➔ `main`
- **Head Commit SHA**: `<head-sha>`
- **CI / Build Status**: ✅ All checks passed

#### 🤖 Reviewer Bot Dispositions
| Reviewer Bot | Status | Findings | Resolution Summary |
| :--- | :--- | :--- | :--- |
| **Cubic** | Reviewed | 1 accepted, 0 blocking | Resolved in `<SHA>` |
| **Sourcery** | Reviewed | 2 suggestions | 1 accepted, 1 rejected (rationale noted) |
| **CodeRabbit** | Skipping / Passed | 0 blocking | Monitored |
| **CI Actions** | Passed | Green (Playwright + Build) | 100% Passing |

#### 🛠️ Key Improvements Made
- Point 1
- Point 2

**PR Status**: Ready for human merge approval.
```
