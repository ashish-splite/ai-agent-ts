// Requires: Kubernetes plugin, Git plugin
// Assumptions (change if incorrect):
//  - Build runs via Kaniko (no privileged docker daemon needed on k8s agents)
//  - Image tag = short git SHA of ai-agent-ts, also pushed as "latest"
//  - Argo infra repo update is a direct commit+push to its default branch
//  - Both GitHub repos are reachable with the same "github-credentials" entry
pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command: ["sleep"]
      args: ["9999999"]
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
    - name: git
      image: alpine/git:2.45.2
      command: ["sleep"]
      args: ["9999999"]
    - name: yq
      image: mikefarah/yq:4
      command: ["sleep"]
      args: ["9999999"]
  volumes:
    - name: docker-config
      emptyDir: {}
"""
        }
    }

    environment {
        DOCKERHUB_REPO   = 'thedarkest22/jarvis'
        ARGO_INFRA_REPO  = 'https://github.com/ashish-splite/argocd-infra.git'
        ARGO_INFRA_BRANCH = 'main'
        ARGO_VALUES_FILE = 'applications/jarvis/chart/values.yaml'   // path inside argo-infra repo
        ARGO_IMAGE_TAG_KEY = '.image.tag'               // yq path to update
    }

    stages {
        stage('Checkout app source') {
            steps {
                checkout scm
                script {
                    env.GIT_TAG = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.FULL_IMAGE = "${DOCKERHUB_REPO}:${GIT_TAG}"
                    env.LATEST_IMAGE = "${DOCKERHUB_REPO}:latest"
                }
                echo "Building ${FULL_IMAGE}"
            }
        }

        stage('Build & push image (Kaniko)') {
            steps {
                container('kaniko') {
                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh '''
                            AUTH=$(printf "%s:%s" "$DOCKER_USER" "$DOCKER_PASS" | base64 | tr -d '\\n')
                            cat > /kaniko/.docker/config.json <<EOF
{"auths":{"https://index.docker.io/v1/":{"auth":"$AUTH"}}}
EOF
                            /kaniko/executor \
                                --context "$WORKSPACE" \
                                --dockerfile "$WORKSPACE/Dockerfile" \
                                --destination "$FULL_IMAGE" \
                                --destination "$LATEST_IMAGE" \
                                --cache=true
                        '''
                    }
                }
            }
        }

        stage('Update Argo infra repo') {
            steps {
                container('git') {
                    withCredentials([usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )]) {
                        sh '''
                            rm -rf argo-infra
                            AUTH_URL=$(echo "$ARGO_INFRA_REPO" | sed "s#https://#https://$GIT_USER:$GIT_TOKEN@#")
                            git clone --branch "$ARGO_INFRA_BRANCH" --depth 1 "$AUTH_URL" argo-infra
                        '''
                    }
                }
                container('yq') {
                    sh '''
                        yq -i "${ARGO_IMAGE_TAG_KEY} = \\"${GIT_TAG}\\"" "argo-infra/${ARGO_VALUES_FILE}"
                    '''
                }
                container('git') {
                    withCredentials([usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )]) {
                        sh '''
                            cd argo-infra
                            git config user.email "jenkins-ci@thedarkest22.local"
                            git config user.name "jenkins-ci"
                            git add "$ARGO_VALUES_FILE"
                            if git diff --cached --quiet; then
                                echo "No changes to commit"
                            else
                                git commit -m "chore(jarvis): bump image tag to ${GIT_TAG}"
                                AUTH_URL=$(echo "$ARGO_INFRA_REPO" | sed "s#https://#https://$GIT_USER:$GIT_TOKEN@#")
                                git push "$AUTH_URL" HEAD:"$ARGO_INFRA_BRANCH"
                            fi
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pushed ${FULL_IMAGE} and updated argo-infra values.yaml -> Argo CD will auto-sync"
        }
        failure {
            echo "Pipeline failed - check stage logs above"
        }
    }
}
