// EN: Production deploy for the Inochi REST API (Express + Sequelize).
//     Jenkins runs on the same VPS as the app, so we delegate to the
//     on-server `inochi-deploy` script which pulls origin/master into
//     `/home/inochi/back-end`, runs `npm install --omit=dev`, then
//     restarts PM2 process `inochi-api` (port 5000, proxied by nginx
//     for api.inochieducation.com).
// BN: Inochi REST API (Express + Sequelize)-এর production deploy। Jenkins
//     এই VPS-এই, তাই server-এর `inochi-deploy` script-কে delegate করি —
//     script `/home/inochi/back-end`-এ origin/master pull, `npm install
//     --omit=dev`, তারপর PM2 process `inochi-api` (port 5000, nginx-এ
//     api.inochieducation.com-এর জন্য proxied) restart।
pipeline {
  agent any
  options {
    timestamps()
    timeout(time: 10, unit: 'MINUTES')
    disableConcurrentBuilds()
  }
  stages {
    // EN: Backend repo's default branch is still 'master' (legacy from before
    //     the project switched to 'main' on other repos). Tracked here for
    //     visibility — the deploy script also pulls master directly.
    // BN: Backend repo-র default branch এখনও 'master' (অন্য repo-গুলো main-এ
    //     যাওয়ার আগে থেকে legacy)। Visibility-এর জন্য এখানে tracked — deploy
    //     script-ও সরাসরি master-ই pull করে।
    stage('Checkout') {
      steps {
        git branch: 'master', url: 'https://github.com/nazim9290/Inochi-back-end.git'
      }
    }
    stage('Deploy') {
      steps {
        sh 'sudo /usr/local/bin/inochi-deploy backend'
      }
    }
  }
  post {
    success {
      echo '✓ Backend deployed — https://api.inochieducation.com'
    }
    failure {
      echo '✗ Backend deploy failed — check the Deploy stage log above for the failing step.'
    }
  }
}
