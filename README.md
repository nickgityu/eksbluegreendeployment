# Blue green deployment for web application on EKS

## Deploy infra pipeline and app pipeline via AWS CDK
* `cd pipeline-cdk`
* `npm run ci`
* `npm run build`
* `cdk synth`
* `cdk deploy`

## deploy EKS clustre
Push the eks-cdk folder to the infra repo, EKS cluster should be deployed automatically via the infra pipeline

## deploy blue green EKS app
Push the k8s folder to the app repo, the application should be deployed automatically via the app pipeline

