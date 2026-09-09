// Requires: local Jenkins agent with Docker CLI + git on PATH
// Assumptions (change if incorrect):
//  - Local Jenkins agent (this machine) builds the image directly via `docker build`
//  - Image tag = short git SHA of ai-agent-ts, also pushed as "latest"
//  - Argo infra repo update is a direct commit+push to its default branch
//  - Both GitHub repos are reachable with the same "github-credentials" entry
//  - yq runs via a throwaway Docker container (mikefarah/yq) - no host install needed
pipeline {
    agent any

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

        stage('Build & push image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker build -t "$FULL_IMAGE" -t "$LATEST_IMAGE" .
                        docker push "$FULL_IMAGE"
                        docker push "$LATEST_IMAGE"
                        docker logout
                    '''
                }
            }
        }

        stage('Update Argo infra repo') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-credentials',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh '''
                        rm -rf argo-infra
                        AUTH_URL=$(echo "$ARGO_INFRA_REPO" | sed "s#https://#https://$GIT_USER:$GIT_TOKEN@#")
                        git clone --branch "$ARGO_INFRA_BRANCH" --depth 1 "$AUTH_URL" argo-infra

                        docker run --rm -v "$WORKSPACE/argo-infra":/workdir mikefarah/yq \
                            eval -i "${ARGO_IMAGE_TAG_KEY} = \\"${GIT_TAG}\\"" "/workdir/${ARGO_VALUES_FILE}"

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

    post {
        success {
            echo "Pushed ${FULL_IMAGE} and updated argo-infra values.yaml -> Argo CD will auto-sync"
        }
        failure {
            echo "Pipeline failed - check stage logs above"
        }
    }
}
