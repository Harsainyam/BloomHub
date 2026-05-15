pipeline {
    agent { label 'agent-1' }

    stages {
        stage('Clone') {
            steps {
                git branch: 'master',
                    credentialsId: 'github-creds',
                    url: 'https://github.com/Harsainyam/BloomHub.git'
            }
        }
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
        stage('Deploy') {
            steps {
                sh '''
                    pkill node || true
                    nohup node server.js &
                '''
            }
        }
    }
    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
