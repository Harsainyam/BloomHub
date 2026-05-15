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
            cd /home/ubuntu/jenkins-agent/workspace/Pipeline
            cp /home/ubuntu/jenkins-agent/workspace/Pipeline/.env /home/ubuntu/.env
            nohup node /home/ubuntu/jenkins-agent/workspace/Pipeline/server.js > /home/ubuntu/app.log 2>&1 &
            sleep 3
            echo "App started on port 3000"
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
