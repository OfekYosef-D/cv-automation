# Jenkins Session Handoff

This file is for opening a new chat/session and continuing the Jenkins learning path without losing context.

## Goal

The user is preparing for a DevOps student interview with a team leader.

The goal is fast, practical Jenkins learning:

- Explain the concept.
- Apply it in the local project.
- Run Jenkins.
- Debug real failures.
- Translate the result into interview-ready language.

## User Style Preference

The user likes hands-on learning and wants concise explanations with practical meaning.

Technical implementation can be in English.

When explaining in Hebrew, use natural Israeli high-tech speech and avoid mixing raw English words inside Hebrew sentences because left-to-right and right-to-left text makes sentences hard to read.

Preferred Hebrew wording:

- ג׳נקינס
- דוקר
- קונטיינר
- פייפליין
- ריפוזיטורי
- בילד
- טסטים
- דיפלוי
- ארטיפקט
- קרדנשלס
- אימג' של דוקר
- דב
- סטייג'ינג
- פרודקשן
- קומיט
- גיט
- גיטהאב
- ברנצ׳
- ברנצ׳ים
- פיצ׳ר ברנצ׳
- מאסטר
- ריליס
- אפרובל
- טאג
- פול ריקווסט
- מרג׳
- קונפיגורציה
- סביבה
- וובהוק
- אנג׳ין־אקס
- אנג׳ירוק
- ריוורס פרוקסי

## Workspace

Project path:

```text
c:\Coding\Fullstack Projects\cv-automation
```

Important files:

```text
Jenkinsfile
jenkins/Dockerfile
nginx/jenkins.conf
jenkins-learning-summary.md
jenkins-session-handoff.md
```

## Current Local Jenkins Setup

Jenkins runs locally in Docker.

Container:

```text
jenkins
```

Image:

```text
local-jenkins-docker-cli
```

The custom Jenkins image installs Docker CLI. Jenkins runs with the host Docker socket mounted, so it can start Node containers and build Docker images.

Local learning caveat:

Running Jenkins as root with Docker socket access is acceptable for this local lab, but not production-safe. In a real company, prefer dedicated agents, controlled Docker permissions, Kubernetes agents, or locked-down runners.

Useful commands:

```powershell
docker start jenkins
docker logs -f jenkins
docker stop jenkins
```

## Current Jenkins Jobs

Old SCM pipeline job:

```text
cv-automation-from-scm
```

Current important job:

```text
cv-automation-multibranch
```

It is a Multibranch Pipeline using GitHub Branch Source.

Current source:

```text
Owner: OfekYosef-D
Repository: cv-automation
Script Path: Jenkinsfile
```

It currently discovers:

- branches
- pull requests from origin

Fork pull requests were removed/avoided for safety because the repo is public and running untrusted fork code with local Docker socket access is risky.

Only `master` currently remains after branch cleanup.

## Current Jenkinsfile Capabilities

The pipeline currently:

1. Prints build context.
2. Inspects workspace.
3. Runs Node/pnpm stages inside `node:20-bookworm` Docker containers.
4. Installs dependencies with frozen lockfile.
5. Runs lint.
6. Runs TypeScript typecheck.
7. Runs stable tests excluding `@cv/api` by default.
8. Generates JUnit XML reports.
9. Optionally runs API tests with `RUN_API_TESTS=true`.
10. Builds non-API packages.
11. Builds a real worker Docker image from `apps/worker/Dockerfile`.
12. Writes image metadata to `build/image-metadata.txt`.
13. Optionally simulates registry push with Jenkins credentials.
14. Optionally simulates deployment to dev/staging/production.
15. Requires manual approval before production deployment simulation.
16. Writes deployment metadata to `build/deploy-<env>.txt`.
17. Archives `build/*.txt`.
18. Publishes JUnit test reports in `post { always { ... } }`.

## Current Parameters

```text
RUN_API_TESTS
```

Default: `false`

Reason: API tests were too heavy for local Jenkins/Docker memory.

```text
SIMULATE_REGISTRY_PUSH
```

Default: `false`

Uses Jenkins credential:

```text
demo-registry-login
```

This simulates Docker registry login/tag/push without exposing the secret and without pushing to a real registry.

```text
DEPLOY_ENV
```

Choices:

```text
none
dev
staging
production
```

`production` triggers a manual `input` approval gate before simulated deployment.

## Credentials Practiced

Demo registry credential:

```text
ID: demo-registry-login
Kind: Username with password
Username: demo-user
Password: fake-registry-token-123
```

Learning:

The Jenkinsfile references credential IDs, not secret values. `withCredentials` injects secrets only inside a scoped block.

## Docker Image Learning

The pipeline builds a real Docker image:

```text
cv-automation-worker:build-<BUILD_NUMBER>
cv-automation-worker:<commit-short>
```

The image is stored in the local Docker daemon, not as a Jenkins file artifact.

Jenkins archives metadata about the image, not the image itself.

Worker image command:

```text
tsx apps/worker/src/main.ts
```

If run directly, it may fail without runtime dependencies like Redis, database URL, and environment variables.

The user cleaned old `cv-automation-worker:*` images to free disk space.

## Deployment Simulation Learning

The pipeline simulates deployment by environment.

Concepts covered:

- environments are runtime targets, not branches
- dev/staging/production are deployment environments
- branches can be used as rules to decide where to deploy
- build once, promote the same artifact
- production should require approval
- deployment metadata gives traceability

Current simulation uses the locally built image. In real deployment, the image should first be pushed to a registry, and deployment should pull the image from the registry.

## Multibranch Pipeline Learning

The user created:

```text
cv-automation-multibranch
```

Concepts covered:

- multibranch scans repository branches
- only branches with a Jenkinsfile at the configured script path are relevant
- branch deletion in GitHub removes branches from multibranch after scan
- merge does not automatically delete a branch
- old branches were cleaned locally and remotely
- only `master` remains

Important distinction:

```text
scan = discover branches / PRs / Jenkinsfiles / changes
build = run the Jenkinsfile
```

A scan does not always rebuild everything.

## Webhook / NGINX / ngrok Setup

Jenkins local URL:

```text
http://localhost:8080
```

NGINX container:

```text
jenkins-nginx
```

NGINX listens locally on port 80 and proxies to Jenkins:

```text
http://jenkins:8080
```

Docker network:

```text
jenkins-net
```

ngrok exposes local NGINX:

```text
ngrok http 80
```

Current ngrok URL during the session:

```text
https://dimmer-uncrown-related.ngrok-free.dev
```

GitHub webhook payload URL:

```text
https://dimmer-uncrown-related.ngrok-free.dev/github-webhook/
```

Webhook flow:

```text
GitHub -> ngrok -> NGINX -> Jenkins
```

The webhook works. Jenkins logs showed:

```text
Received PushEvent
Push event to branch master
```

Build number 3 was triggered by a push to `master`.

## Reverse Proxy Debugging

Problem seen:

```text
It appears that your reverse proxy set up is broken.
```

Root cause:

The user accessed Jenkins via:

```text
http://localhost:8080
```

while Jenkins was configured with public URL:

```text
https://dimmer-uncrown-related.ngrok-free.dev/
```

That bypasses NGINX/ngrok and creates a mismatch.

When accessing Jenkins through the ngrok URL, the warning did not appear and the webhook-triggered build was visible.

NGINX config was updated to pass correct external HTTPS headers:

```nginx
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Forwarded-Port 443;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-Ssl on;
```

## GitHub API Rate Limiting Issue

When the multibranch job used GitHub Branch Source without credentials, Jenkins used anonymous GitHub API access:

```text
Connecting to https://api.github.com with no credentials, anonymous access
Jenkins-Imposed API Limiter
Sleeping for several minutes
```

This made it look like the webhook did nothing, but the build was actually delayed.

Next recommended fix:

Create GitHub credentials in Jenkins and configure the GitHub Branch Source to use them.

This teaches:

- GitHub API credentials
- rate limits
- why even public repositories benefit from authenticated API access in CI

## Important Failures Already Debugged

- Browser 431 error from polluted localhost cookies.
- Node not found on Jenkins agent.
- Jenkins-in-Docker needing Docker CLI and Docker socket.
- Git dubious ownership after changing Jenkins runtime user.
- Local resource pressure from parallel quality gates.
- API Jest tests exhausting memory.
- Docker image cleanup.
- Branch cleanup after old merged PRs.
- Webhook reached Jenkins but build appeared delayed due to GitHub API limiter.
- Reverse proxy warning caused by accessing Jenkins through localhost instead of the public proxy URL.

## Current Best Next Steps

1. Add GitHub API credential/token to Jenkins.
2. Configure `cv-automation-multibranch` GitHub Branch Source to use that credential.
3. Re-test webhook with a small push.
4. Optionally add PR test flow:
   - create feature branch
   - open pull request
   - see Jenkins build PR
5. Optional real registry push:
   - GitHub Container Registry or Docker Hub
   - push image
   - record digest
6. Optional real deployment concept:
   - Docker Compose, remote server, or Kubernetes overview.
7. Update `jenkins-learning-summary.md` after each meaningful learning step.

## Interview Story So Far

The user should be able to say:

```text
I learned Jenkins hands-on by running it locally with Docker. I started with simple pipelines, then moved to a Jenkinsfile from GitHub. I added dependency install, lint, typecheck, tests, reports, build, artifacts, Docker image build, credentials, registry push simulation, deployment simulation, manual approval, multibranch pipeline, and GitHub webhooks through NGINX and ngrok.

I also debugged real CI issues: missing tools on the agent, Docker socket access, Git ownership, local memory pressure, heavy Jest tests, stale branches, reverse proxy URL mismatch, and GitHub API rate limiting. The main thing I learned is that a good pipeline is not just commands. It needs reproducible agents, clear stages, safe credentials, reports, artifacts, traceability, triggers, and a secure path from source control to CI.
```
