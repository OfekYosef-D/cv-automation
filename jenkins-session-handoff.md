# Jenkins Session Handoff

This file is meant for opening a new chat/session and continuing the Jenkins learning path without losing context..

## Goal Of The Conversation

The user is preparing for a DevOps student interview with a team leader on Tuesday at 11:00.

The goal is to learn Jenkins quickly and practically through hands-on work, while building enough understanding to explain the concepts clearly in an interview.

The learning style should stay interactive:

- Explain the concept.
- Apply it in the local project.
- Run Jenkins.
- Debug real failures.
- Translate the result into interview-ready language.

## User Preference

The user likes hands-on learning.

For technical implementation and code work, English is fine.

For interview explanations and personal summaries, the user often prefers Hebrew, but with common Israeli tech loanwords where natural, for example:

- ג׳נקינס
- דוקר
- קונטיינר
- פייפליין
- ריפוזיטורי
- בילד
- טסט
- דיפלוי
- ארטיפקט
- קרדנשלס

Avoid awkward literal translations when Israeli tech speech normally uses the borrowed term.

## Workspace

Project path:

```text
c:\Coding\Fullstack Projects\cv-automation
```

Main files touched during the session:

```text
Jenkinsfile
.dockerignore
jenkins/Dockerfile
jenkins-learning-summary.md
jenkins-session-handoff.md
```

## Current Jenkins Setup

Jenkins runs locally in Docker.

The Jenkins container was customized so it can run Docker-based pipeline stages:

- A local Jenkins image was created from `jenkins/Dockerfile`.
- The image installs the Docker CLI.
- Jenkins is run with the host Docker socket mounted.
- For the local learning setup, Jenkins was run as root so it could access the Docker socket.
- The same `jenkins_home` volume is used, so existing Jenkins jobs/config remain.

Important caveat:

This is acceptable for local learning, but not ideal production security. In a real company, prefer dedicated agents, correct Docker group permissions, Kubernetes agents, or other controlled agent setups.

## Current Jenkins Job

The Jenkins job is:

```text
cv-automation-from-scm
```

It is configured as:

```text
Pipeline script from SCM
SCM: Git
Repository: https://github.com/OfekYosef-D/cv-automation.git
Branch: */master
Script Path: Jenkinsfile
```

The job currently reads the `Jenkinsfile` from GitHub.

## Current Pipeline Capabilities

The current `Jenkinsfile` does the following:

1. Prints basic build context.
2. Inspects the workspace and verifies important files exist.
3. Runs Node/pnpm work inside `node:20-bookworm` Docker containers.
4. Installs dependencies with `pnpm install --frozen-lockfile`.
5. Runs lint.
6. Runs typecheck.
7. Runs stable tests while excluding `@cv/api` by default.
8. Generates JUnit XML test reports for selected Vitest packages.
9. Publishes test reports in Jenkins with `junit`.
10. Optionally runs API tests if `RUN_API_TESTS=true`.
11. Runs a build stage for non-API packages.
12. Builds a Docker image for the worker using `apps/worker/Dockerfile`.
13. Writes Docker image metadata to `build/image-metadata.txt`.
14. Writes general build metadata to `build/metadata.txt`.
15. Archives `build/*.txt` as Jenkins artifacts.

## Current Parameter

The pipeline has this parameter:

```text
RUN_API_TESTS
```

Default:

```text
false
```

Reason:

The API Jest test suite caused memory pressure in the local Jenkins/Docker environment. It should stay disabled by default while learning Jenkins concepts.

## Important Failures Already Debugged

### Browser 431 Error

Opening `localhost:8080` initially returned a 431 error.

Root cause:

Browser cookies/site data for localhost were too large or polluted.

Fix:

Clear browser site data/cookies or use `127.0.0.1`.

Learning:

Jenkins was reachable; the browser request was the issue.

### Node Not Found

The Jenkins pipeline failed with:

```text
node: not found
exit code 127
```

Root cause:

The Jenkins container did not have Node installed.

Fix:

Run Node stages inside a Docker agent using `node:20-bookworm`.

Learning:

The `Jenkinsfile` defines what to run; the agent environment determines what can actually run.

### Docker CLI / Docker Socket

To use Docker agents, Jenkins needed access to Docker.

Actions taken:

- Built a custom local Jenkins image with Docker CLI.
- Mounted `/var/run/docker.sock`.
- Ran Jenkins as root for local learning.

Learning:

Jenkins inside Docker needs access to the host Docker daemon if it is going to start other containers.

### Git Safe Directory

After restarting Jenkins as root, Git failed because existing workspaces were owned by the previous `jenkins` user.

Root cause:

Git detected dubious ownership.

Fix:

Marked Jenkins workspace/cache directories as safe in Git config inside the Jenkins container.

Learning:

Changing the runtime user affects Git workspace trust and file ownership.

### Parallel Quality Gates Killed Jenkins

Running lint, typecheck, and tests in parallel created multiple Node containers and overloaded Docker Desktop.

Symptom:

Jenkins exited with code 137.

Fix:

Run quality gates sequentially and add timeouts/resource limits.

Learning:

Parallel CI is useful on strong infrastructure, but local Jenkins may need sequential stages.

### API Jest Tests Exhausted Memory

The `@cv/api` Jest suite failed with worker `SIGKILL` and later Node heap out-of-memory.

Root cause:

The NestJS/API test suite loads heavy TypeScript/Jest/Prisma/Nest dependencies and exceeds local CI memory limits.

Decision:

Skip API tests by default using `RUN_API_TESTS=false`.

Learning:

Not every CI failure is a code bug. Some are resource/configuration/environment failures.

## Current Build Artifacts

Jenkins currently archives:

```text
build/metadata.txt
build/image-metadata.txt
```

The Docker image itself does not appear as a Jenkins file artifact. It is stored in the local Docker daemon.

To inspect locally:

```powershell
docker images cv-automation-worker
```

## Concepts Already Covered

The user has already learned and practiced:

- Jenkins jobs and builds.
- Jenkins workspaces.
- Controllers and agents at a basic level.
- Declarative Pipeline syntax.
- Stages and steps.
- Shell steps.
- Exit codes.
- Console output.
- `post` actions.
- Artifacts.
- Test reports.
- Parameters.
- Conditional stages.
- Manual approval gates.
- Jenkins Credentials.
- Groovy sandbox.
- Pipeline as Code with `Jenkinsfile`.
- Pipeline from SCM.
- Docker-based agents.
- Agent tooling and missing tools.
- Dependency install with pnpm and frozen lockfile.
- Lint/typecheck/test quality gates.
- CI resource pressure.
- Timeouts and resource limits.
- JUnit XML test reporting.
- Build stage.
- Docker image build stage.
- Tags vs image IDs/digests conceptually.

## Next Steps To Continue

Continue from here:

### 1. Credentials And Registry Practice

The last planned next step was credentials plus image push simulation.

The user did not read the previous credentials explanation in detail and explicitly said they had not read it.

Recommended approach:

First do a fake/safe registry credential exercise:

- In Jenkins, create a username/password credential.
- Suggested ID:

```text
demo-registry-login
```

- Username:

```text
demo-user
```

- Password:

```text
fake-registry-token-123
```

Then add a stage that uses `withCredentials` to simulate registry login/push without exposing the secret.

Explain that the real version would be:

- `docker login`
- `docker push`
- record registry digest

Do not push to a real registry unless the user wants it.

### 2. Real Registry Push

Optional after fake credentials:

Use GitHub Container Registry or Docker Hub.

Teach:

- registry credentials
- image tags
- immutable digest after push
- why deployment should use a pushed image, not just a local image

### 3. Deployment Simulation

Add a deployment simulation stage:

- `dev` deploy automatic
- `staging` deploy parameterized
- `prod` requires manual `input`

No real production deploy needed.

Teach:

- promotion
- approval gates
- environment-specific behavior
- release traceability

### 4. Multibranch Pipeline

Teach Jenkins Multibranch Pipeline:

- Jenkins discovers branches.
- Each branch can run its own `Jenkinsfile`.
- PR builds vs main branch builds.

This is interview-relevant.

### 5. Webhooks

Teach:

- right now builds are manual
- real CI usually starts from GitHub webhook
- push/PR triggers Jenkins build

### 6. Update Summary File At End

At the end of the next session, update:

```text
jenkins-learning-summary.md
```

Add:

- credentials/registry learning
- deployment simulation
- multibranch
- webhooks

Keep it in first person, interview-ready Hebrew.

## Hebrew Explanation Style Preference

When explaining Jenkins/DevOps concepts in Hebrew, use natural Israeli high-tech speech instead of formal or awkward translations.

Preferred wording examples:

- אימג' של דוקר, not "Docker Image"
- דב, not `dev`
- סטייג'ינג, not `staging`
- פרודקשן, not `production`
- קומיט, not `commit`
- בילד
- טסטים
- דיפלוי
- פייפליין
- ריפוזיטורי
- קרדנשלס

Use this style for interview explanations and personal summaries.

Avoid mixing raw English words inside Hebrew sentences because left-to-right and right-to-left text can make the sentence hard to read. In Hebrew explanations, prefer Hebrew transliteration for common technical terms, including:

- אס-סי-אם, not `SCM`
- גיט, not `Git`
- גיטהאב, not `GitHub`
- ברנצ׳, not `branch`
- ברנצ׳ים, not `branches`
- פיצ׳ר ברנצ׳, not `feature branch`
- מיין or מאסטר, not `main` / `master`
- ריליס, not `release`
- אפרובל, not `approval`
- טאג, not `tag`
- פול ריקווסט, not `pull request`
- מרג׳, not `merge`
- קונפיגורציה, not `configuration`
- אנוויירמנט or סביבה, not `environment`

## User’s Interview Story So Far

The user should be able to say:

```text
I started learning Jenkins hands-on before the job.
I ran Jenkins locally with Docker.
I created simple pipelines, then moved to Pipeline as Code with a Jenkinsfile from GitHub.
I added dependency install, lint, typecheck, tests, test reports, build, artifacts, and Docker image build.
I debugged real CI issues: missing Node on the agent, Docker access, Git workspace ownership, memory pressure, and heavy Jest tests.
The main thing I learned is that Jenkins is not just running commands. A good pipeline needs a reproducible agent environment, clear stages, safe credentials, test visibility, artifacts, and traceability.
```
