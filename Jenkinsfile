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
