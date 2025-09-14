pipeline {
    agent any

    environment {
        // Ajustá estos valores con tus datos
        DOCKERHUB_CREDENTIALS = 'dckr_pat_3mR4KQjbMwq9LlrvO9ibMQqYGOw'  // credencial en Jenkins
        DOCKERHUB_USERNAME = 'maimerar'
        IMAGE_NAME = "${DOCKERHUB_USERNAME}/devops-tp-skeleton"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Raremiam/devops-tp-skeleton'
            }
        }

        stage('Install & Test') {
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Usamos la versión del commit para tag aparte de latest
                    def commitSha = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    env.IMAGE_TAG = "sha-${commitSha}"
                    sh "docker build -t ${IMAGE_NAME}:latest -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                      echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                      docker push ${IMAGE_NAME}:latest
                      docker push ${IMAGE_NAME}:${IMAGE_TAG}
                    '''
                }
            }
        }
    }

    post {
        always {
            // Limpieza opcional
            sh 'docker logout'
        }
        success {
            echo "Build & Push completado correctamente."
        }
        failure {
            echo "Algo falló. Revisa los logs."
        }
    }
}
