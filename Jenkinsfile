pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
    }

    parameters {
        booleanParam(
            name: 'RUN_API_TESTS',
            defaultValue: false,
            description: 'Run @cv/api Jest tests. Disabled by default for local Jenkins stability.'
        )
        booleanParam(
            name: 'SIMULATE_REGISTRY_PUSH',
            defaultValue: false,
            description: 'Use demo Jenkins credentials to simulate Docker registry login and image push.'
        )
        choice(
            name: 'DEPLOY_ENV',
            choices: ['none', 'dev', 'staging', 'production'],
            description: 'Choose an environment for deployment simulation.'
        )
    }

    environment {
        APP_NAME = 'cv-automation'
        CI = 'true'
        TURBO_TELEMETRY_DISABLED = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Building ${APP_NAME}"
                echo "Branch: ${env.BRANCH_NAME ?: 'manual-job'}"
                echo "Build number: ${env.BUILD_NUMBER}"
            }
        }

        stage('Inspect Workspace') {
            steps {
                sh 'pwd'
                sh 'ls -la'
                sh 'test -f package.json'
                sh 'test -f pnpm-lock.yaml'
            }
        }
        stage('Install Dependencies In Node Container') {
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root'
                    reuseNode true
                }
            }
            steps {
                sh 'node --version'
                sh 'corepack --version'
                sh 'corepack enable'
                sh 'pnpm --version'
                sh 'pnpm config set store-dir .pnpm-store'
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Lint In Node Container') {
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root'
                    reuseNode true
                }
            }
            steps {
                sh 'corepack enable'
                sh 'pnpm lint'
            }
        }

        stage('Typecheck In Node Container') {
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root'
                    reuseNode true
                }
            }
            steps {
                sh 'corepack enable'
                sh 'pnpm typecheck'
            }
        }

        stage('Test In Node Container') {
            options {
                timeout(time: 8, unit: 'MINUTES')
            }
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root --memory=3g --cpus=2'
                    reuseNode true
                }
            }
            steps {
                sh 'corepack enable'
                sh 'pnpm turbo run test --concurrency=1 --filter=!@cv/api'
            }
        }

        stage('Generate Test Reports In Node Container') {
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root --memory=3g --cpus=2'
                    reuseNode true
                }
            }
            steps {
                sh 'corepack enable'
                sh 'rm -rf test-results && mkdir -p test-results'
                sh 'pnpm --filter @cv/matching exec vitest run --reporter=junit --outputFile=../../test-results/matching.xml'
                sh 'pnpm --filter @cv/shared exec vitest run --reporter=junit --outputFile=../../test-results/shared.xml'
                sh 'pnpm --filter @cv/worker exec vitest run --reporter=junit --outputFile=../../test-results/worker.xml'
            }
        }

        stage('API Tests In Node Container') {
            when {
                expression {
                    return params.RUN_API_TESTS
                }
            }
            options {
                timeout(time: 10, unit: 'MINUTES')
            }
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root --memory=4g --cpus=2'
                    reuseNode true
                }
            }
            steps {
                sh 'corepack enable'
                sh 'NODE_OPTIONS=--max-old-space-size=3072 pnpm --filter @cv/api test -- --runInBand'
            }
        }

        stage('Build In Node Container') {
            options {
                timeout(time: 10, unit: 'MINUTES')
            }
            agent {
                docker {
                    image 'node:20-bookworm'
                    args '-u root:root --memory=4g --cpus=2'
                    reuseNode true
                }
            }
            steps {
                sh 'corepack enable'
                sh 'pnpm turbo run build --concurrency=1 --filter=!@cv/api'
            }
        }

        stage('Build Docker Image Artifact') {
            options {
                timeout(time: 15, unit: 'MINUTES')
            }
            steps {
                sh 'docker --version'
                sh '''
                    set -eu
                    IMAGE_NAME="${APP_NAME}-worker"
                    COMMIT_SHORT="$(printf "%s" "${GIT_COMMIT:-unknown}" | cut -c1-12)"
                    IMAGE_TAG="${IMAGE_NAME}:build-${BUILD_NUMBER}"
                    COMMIT_TAG="${IMAGE_NAME}:${COMMIT_SHORT}"

                    docker build -f apps/worker/Dockerfile -t "${IMAGE_TAG}" -t "${COMMIT_TAG}" .

                    IMAGE_ID="$(docker image inspect "${IMAGE_TAG}" --format "{{.Id}}")"

                    mkdir -p build
                    {
                        echo "image_name=${IMAGE_NAME}"
                        echo "image_tag=${IMAGE_TAG}"
                        echo "commit_tag=${COMMIT_TAG}"
                        echo "image_id=${IMAGE_ID}"
                        echo "git_commit=${GIT_COMMIT:-unknown}"
                        echo "jenkins_build=${BUILD_NUMBER}"
                    } > build/image-metadata.txt

                    cat build/image-metadata.txt
                '''
            }
        }

        stage('Simulate Registry Push With Credentials') {
            when {
                expression {
                    return params.SIMULATE_REGISTRY_PUSH
                }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'demo-registry-login',
                        usernameVariable: 'REGISTRY_USERNAME',
                        passwordVariable: 'REGISTRY_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -eu
                        IMAGE_NAME="${APP_NAME}-worker"
                        LOCAL_TAG="${IMAGE_NAME}:build-${BUILD_NUMBER}"
                        REGISTRY_HOST="demo-registry.local"
                        REMOTE_TAG="${REGISTRY_HOST}/${IMAGE_NAME}:build-${BUILD_NUMBER}"

                        test -n "${REGISTRY_USERNAME}"
                        test -n "${REGISTRY_PASSWORD}"
                        docker image inspect "${LOCAL_TAG}" >/dev/null

                        echo "Simulating registry login as ${REGISTRY_USERNAME}"
                        echo "Simulating: docker tag ${LOCAL_TAG} ${REMOTE_TAG}"
                        echo "Simulating: docker push ${REMOTE_TAG}"

                        mkdir -p build
                        {
                            echo "registry_host=${REGISTRY_HOST}"
                            echo "registry_username=${REGISTRY_USERNAME}"
                            echo "local_tag=${LOCAL_TAG}"
                            echo "remote_tag=${REMOTE_TAG}"
                            echo "push_status=simulated"
                            echo "jenkins_build=${BUILD_NUMBER}"
                        } > build/registry-simulation.txt

                        cat build/registry-simulation.txt
                    '''
                }
            }
        }

        stage('Production Deployment Approval') {
            when {
                expression {
                    return params.DEPLOY_ENV == 'production'
                }
            }
            options {
                timeout(time: 5, unit: 'MINUTES')
            }
            steps {
                input message: "Approve simulated production deployment for build ${env.BUILD_NUMBER}?",
                    ok: 'Approve production simulation'
            }
        }

        stage('Simulate Deployment') {
            when {
                expression {
                    return params.DEPLOY_ENV != 'none'
                }
            }
            steps {
                sh '''
                    set -eu
                    IMAGE_NAME="${APP_NAME}-worker"
                    IMAGE_TAG="${IMAGE_NAME}:build-${BUILD_NUMBER}"
                    DEPLOY_TARGET="${DEPLOY_ENV}"

                    docker image inspect "${IMAGE_TAG}" >/dev/null

                    case "${DEPLOY_TARGET}" in
                        dev)
                            DEPLOY_URL="https://dev.example.local/cv-automation"
                            APPROVAL_REQUIRED="false"
                            ;;
                        staging)
                            DEPLOY_URL="https://staging.example.local/cv-automation"
                            APPROVAL_REQUIRED="false"
                            ;;
                        production)
                            DEPLOY_URL="https://prod.example.local/cv-automation"
                            APPROVAL_REQUIRED="true"
                            ;;
                        *)
                            echo "Unsupported deployment target: ${DEPLOY_TARGET}" >&2
                            exit 1
                            ;;
                    esac

                    echo "Simulating deployment to ${DEPLOY_TARGET}"
                    echo "Simulating: deploy ${IMAGE_TAG} to ${DEPLOY_URL}"

                    mkdir -p build
                    {
                        echo "deploy_status=simulated"
                        echo "deploy_environment=${DEPLOY_TARGET}"
                        echo "deploy_url=${DEPLOY_URL}"
                        echo "approval_required=${APPROVAL_REQUIRED}"
                        echo "image_tag=${IMAGE_TAG}"
                        echo "git_commit=${GIT_COMMIT:-unknown}"
                        echo "jenkins_build=${BUILD_NUMBER}"
                    } > "build/deploy-${DEPLOY_TARGET}.txt"

                    cat "build/deploy-${DEPLOY_TARGET}.txt"
                '''
            }
        }

        stage('Create Build Metadata') {
            steps {
                sh 'mkdir -p build'
                sh 'echo "app=${APP_NAME}" > build/metadata.txt'
                sh 'echo "build=${BUILD_NUMBER}" >> build/metadata.txt'
                sh 'echo "commit=${GIT_COMMIT:-unknown}" >> build/metadata.txt'
                sh 'cat build/metadata.txt'
            }
        }
    }

    post {
        always {
            junit testResults: 'test-results/*.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'build/*.txt', fingerprint: true, allowEmptyArchive: true
        }

        success {
            echo 'Pipeline from Jenkinsfile completed successfully.'
        }

        failure {
            echo 'Pipeline from Jenkinsfile failed. Check the failed stage and console output.'
        }
    }
}
