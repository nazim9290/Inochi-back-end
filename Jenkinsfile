// EN: Production deploy for the Inochi REST API (Express + Sequelize).
//     Jenkins runs on the same VPS as the app, so we delegate to the
//     on-server `inochi-deploy` script which pulls origin/main into
//     `/home/inochi/back-end`, runs `npm install --omit=dev`, then
//     restarts PM2 process `inochi-api` (port 5000, proxied by nginx
//     for api.inochieducation.com).
// BN: Inochi REST API (Express + Sequelize)-এর production deploy। Jenkins
//     এই VPS-এই, তাই server-এর `inochi-deploy` script-কে delegate করি —
//     script `/home/inochi/back-end`-এ origin/main pull, `npm install
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
    // EN: Renamed master → main on 2026-05-02 to align with the admin and
    //     frontend repos. Checkout records the commit hash in build history;
    //     the on-server deploy script also pulls main directly.
    // BN: ২০২৬-০৫-০২ তারিখে master → main rename করা হয়েছে — admin আর
    //     frontend repo-র সাথে align করে। Build history-তে commit hash record
    //     করার জন্য Checkout; on-server deploy script-ও main-ই pull করে।
    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/nazim9290/Inochi-back-end.git'
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
