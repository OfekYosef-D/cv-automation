pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        APP_NAME = 'cv-automation'
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

        stage('Quality Gates In Node Container') {
            parallel {
                stage('Lint') {
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

                stage('Typecheck') {
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

                stage('Test') {
                    agent {
                        docker {
                            image 'node:20-bookworm'
                            args '-u root:root'
                            reuseNode true
                        }
                    }
                    steps {
                        sh 'corepack enable'
                        sh 'pnpm test'
                    }
                }
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
