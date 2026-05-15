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
            sleep 1
            cp /home/ubuntu/app.env /home/ubuntu/jenkins-agent/workspace/Pipeline/.env
            cd /home/ubuntu/jenkins-agent/workspace/Pipeline
            nohup node server.js > /home/ubuntu/app.log 2>&1 &
            sleep 3
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
