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
