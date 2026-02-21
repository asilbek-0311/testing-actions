# CI/CD with Docker & GitHub Actions — Project Guide

> A practical reference for this Next.js project's Docker + GitHub Actions setup.

---

## Table of Contents

1. [What You Have Right Now](#1-what-you-have-right-now)
2. [How It Works — End to End](#2-how-it-works--end-to-end)
3. [What You're Doing Right](#3-what-youre-doing-right)
4. [Issues & Things to Fix](#4-issues--things-to-fix)
5. [How to Test Locally](#5-how-to-test-locally)
6. [How to Test the GitHub Actions Workflow](#6-how-to-test-the-github-actions-workflow)
7. [Key Concepts to Know](#7-key-concepts-to-know)
8. [Ideal CI/CD Pipeline Structure](#8-ideal-cicd-pipeline-structure)
9. [Secrets Setup](#9-secrets-setup)
10. [Common Errors & Fixes](#10-common-errors--fixes)

---

## 1. What You Have Right Now

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: deps → builder → runner |
| `.github/workflows/build-and-push.yml` | GitHub Actions: build & push Docker image on push |
| `next.config.ts` | `output: 'standalone'` — required for Docker |
| `.dockerignore` | Prevents unnecessary files from entering the Docker build context |

**Trigger conditions for the workflow:**
- Push to `main` or `develop`
- Pull requests targeting `main`
- Manual trigger (`workflow_dispatch`)

**Where the image is pushed:** `containerreg.officefreund.de/customer-portal`

---

## 2. How It Works — End to End

```
You push code to GitHub (main/develop)
        │
        ▼
GitHub Actions runner starts (ubuntu-latest)
        │
        ├─ Checkout code
        ├─ Set up Docker Buildx (multi-platform builder)
        ├─ Log in to your container registry
        ├─ Extract metadata (tags based on branch/SHA)
        ├─ Build Docker image (multi-stage)
        │     Stage 1 (deps)    → npm ci --only=production
        │     Stage 2 (builder) → npm run build
        │     Stage 3 (runner)  → minimal image with built output
        └─ Push image to registry
```

**Generated image tags (examples):**

| Event | Tags produced |
|-------|--------------|
| Push to `main` | `main`, `main-abc1234`, `latest` |
| Push to `develop` | `develop`, `develop-abc1234` |
| Pull Request #5 | `pr-5` |

---

## 3. What You're Doing Right

**Dockerfile:**
- Multi-stage build — keeps the final image small (no dev dependencies, no source files)
- Non-root user (`nextjs:nodejs`) — good security practice
- `output: 'standalone'` in `next.config.ts` — required for this Dockerfile pattern to work (copies `.next/standalone`)
- Disables Next.js telemetry in CI/production
- Uses `node:18-alpine` — minimal base image

**GitHub Actions workflow:**
- Pinned action versions (`@v4`, `@v3`, `@v5`) — prevents supply chain attacks
- Registry cache (`type=registry`) — speeds up subsequent builds significantly
- Dynamic tagging with `docker/metadata-action` — clean, consistent image naming
- Secrets for credentials (never hardcoded)
- `workflow_dispatch` — lets you trigger manually from GitHub UI

---

## 4. Issues & Things to Fix

### Critical

**1. Dockerfile installs only production deps in Stage 1, but builder needs dev deps too**

```dockerfile
# Current (broken for TypeScript/Next.js builds):
RUN npm ci --only=production

# The builder stage copies these node_modules, but then runs `npm run build`
# which needs TypeScript, ESLint, etc. — all devDependencies
```

Fix: The `deps` stage should install ALL dependencies (or you install all in builder):

```dockerfile
# Stage 1: install all deps for building
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci                          # ← remove --only=production

# Then in runner stage, only production deps are needed anyway
# because standalone output bundles everything required
```

**2. Package manager mismatch**

Your `package.json` declares `pnpm` as the package manager:
```json
"packageManager": "pnpm@10.8.1+sha512..."
```

But the Dockerfile uses `npm ci`. This may not cause errors but is inconsistent — use one consistently. For Docker, `npm` is fine and simpler. Just remove the `packageManager` field or align both.

**3. Untracked files not committed**

`git status` shows these are NOT committed yet:
- `.dockerignore`
- `.github/` (the entire workflow!)
- `Dockerfile`

The workflow only runs when it's on GitHub. Push these files:

```bash
git add .dockerignore Dockerfile .github/
git commit -m "Add Dockerfile and GitHub Actions workflow"
git push
```

### Minor

**4. `push: true` always pushes — even on pull requests**

Currently, every PR build pushes an image. This is noisy but not harmful for a personal project. For a real project, use:

```yaml
push: ${{ github.event_name != 'pull_request' }}
```

**5. No lint or test step**

The workflow goes straight to building Docker. Before building, it's good practice to run:
```yaml
- name: Lint
  run: npm run lint
```

---

## 5. How to Test Locally

### Build the Docker image locally

```bash
# From the project root
docker build -t my-next-app .
```

### Run the container

```bash
docker run -p 3000:3000 my-next-app
```

Then open `http://localhost:3000` in your browser.

### Verify the image size and layers

```bash
docker images my-next-app
docker history my-next-app
```

### Debug a build failure

```bash
# Build with verbose output
docker build --progress=plain -t my-next-app . 2>&1 | tee build.log
```

### Test that the standalone output exists (before Docker)

```bash
npm run build
ls .next/standalone    # should exist
ls .next/static        # should exist
```

If `.next/standalone` is missing, `next.config.ts` needs `output: 'standalone'`.

---

## 6. How to Test the GitHub Actions Workflow

### Step 1 — Commit and push your files

```bash
git add .dockerignore Dockerfile next.config.ts .github/
git commit -m "Add Docker and CI/CD setup"
git push origin main
```

### Step 2 — Watch the workflow run

1. Go to your GitHub repo
2. Click the **Actions** tab
3. You'll see the "Build and Push Docker Image" workflow
4. Click it to see each step's logs

### Step 3 — Set up secrets (required before the push step works)

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Add:
- `REGISTRY_USERNAME` — your registry username
- `REGISTRY_PASSWORD` — your registry password or token

Without these, the login step will fail and the image won't be pushed.

### Step 4 — Trigger manually

Once the workflow is committed, you can trigger it manually:
1. **Actions tab** → select the workflow → **Run workflow** button

### Step 5 — Test a pull request flow

```bash
git checkout -b feature/test-pr
# make a small change
git commit -am "test: trigger PR workflow"
git push origin feature/test-pr
```

Then open a PR on GitHub targeting `main`. The workflow will run automatically.

---

## 7. Key Concepts to Know

### Multi-stage Docker builds

Each `FROM` is a new stage. Files from previous stages can be copied with `COPY --from=stagename`. The final image only contains what's in the last stage — earlier stages are thrown away.

This is why your image is small: all the TypeScript compilation, `node_modules` with dev deps, and source files never make it into the final image.

### Docker layer caching

Docker caches each instruction. If a layer's input hasn't changed, Docker reuses the cached layer. That's why you copy `package.json` first and install deps before copying source code — source changes don't invalidate the dependency cache.

```dockerfile
COPY package.json package-lock.json* ./   # cached unless deps change
RUN npm ci                                 # cached unless above changes
COPY . .                                   # source changes don't bust cache above
```

### GitHub Actions secrets

Secrets are encrypted environment variables stored in GitHub. They're never visible in logs. Access them in workflows as `${{ secrets.YOUR_SECRET_NAME }}`.

### `output: 'standalone'` in Next.js

This tells Next.js to create a `server.js` file and copy all necessary files into `.next/standalone`. The result is a directory you can run with `node server.js` without any `node_modules` — perfect for Docker.

### Image tags and versioning

Good tagging strategy:
- `latest` — always the most recent build from default branch
- `main-abc1234` — traceable to a specific commit
- `pr-5` — PR builds for review

Your workflow already does this correctly.

### Registry vs Docker Hub

You're using a private registry (`containerreg.officefreund.de`). This is common in professional setups. Docker Hub is the public default. The workflow is the same — just different registry URLs.

---

## 8. Ideal CI/CD Pipeline Structure

For a personal/learning project, the ideal flow looks like this:

```yaml
on: push to main / PR to main

jobs:
  lint:          # fast, catches errors early
    - npm run lint

  build-app:     # verify the app builds
    - npm run build

  docker:        # build and push image
    needs: [lint, build-app]
    - docker build
    - docker push (only on main, not PRs)

  # Optional: deploy
  deploy:
    needs: [docker]
    - SSH into server and pull new image
    - OR trigger a webhook
    - OR use docker-compose pull && up -d
```

This separates concerns: lint/test failures fail fast without wasting time on a Docker build.

---

## 9. Secrets Setup

| Secret Name | What it is | Where to get it |
|------------|------------|-----------------|
| `REGISTRY_USERNAME` | Username for `containerreg.officefreund.de` | Your registry account |
| `REGISTRY_PASSWORD` | Password or API token | Your registry account |

**To add secrets:**
1. GitHub repo → **Settings**
2. **Secrets and variables** → **Actions**
3. **New repository secret**

If you switch to Docker Hub, use `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (generate a token from Docker Hub settings, not your password).

---

## 10. Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Error: Cannot find module` in runner stage | `npm ci --only=production` skips devDeps needed by Next.js build | Change to `npm ci` in deps stage |
| `COPY failed: file not found .next/standalone` | `output: 'standalone'` missing from `next.config.ts` | Add `output: 'standalone'` |
| `unauthorized: incorrect username or password` | Secrets not set or wrong | Check GitHub Secrets settings |
| Workflow doesn't trigger | Workflow file not pushed to GitHub | `git push` the `.github/` folder |
| `npm ci` fails on `package-lock.json` mismatch | `package-lock.json` is out of date | Run `npm install` locally and commit the updated lockfile |
| Build slow every time | Registry cache not working | Verify the `cache-from`/`cache-to` registry URL is accessible |
| Image pushes on PRs | `push: true` always | Change to `push: ${{ github.event_name != 'pull_request' }}` |

---

## Quick Reference — Commands

```bash
# Local Docker test
docker build -t my-next-app .
docker run -p 3000:3000 my-next-app

# Check Next.js standalone output
npm run build && ls .next/standalone

# Push your CI/CD files to GitHub (triggers first workflow run)
git add .dockerignore Dockerfile next.config.ts .github/
git commit -m "Add Docker and CI/CD setup"
git push origin main

# Manually trigger workflow (after pushing)
# GitHub UI: Actions tab → select workflow → Run workflow
```
