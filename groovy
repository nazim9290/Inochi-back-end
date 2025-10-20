pipeline {
  agent any
  environment {
    APP_NAME = "inochi_backend"
    CONTAINER_NAME = "inochi_backend"
    PORT = "5000"
  }
  stages {
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/nazim9290/Inochi-back-end.git'
      }
    }
    stage('Build Docker Image') {
      steps {
        sh 'docker build -t $APP_NAME .'
      }
    }
    stage('Deploy') {
      steps {
        sh '''
        docker stop $CONTAINER_NAME || true
        docker rm $CONTAINER_NAME || true
        docker run -d --name $CONTAINER_NAME -p 5000:5000 --restart=always $APP_NAME
        '''
      }
    }
  }
}
