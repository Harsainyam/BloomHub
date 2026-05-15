pipeline {
    agent any
    stages {
        stage('Clone') {
            steps {
                git branch: 'master',
                    credentialsId: 'github-creds',
                    url: 'https://github.com/Harsainyam/BloomHub.git'
            }
        }
        stage('Build') {
            steps {
                sh 'echo Build step here'
            }
        }
    }
}
