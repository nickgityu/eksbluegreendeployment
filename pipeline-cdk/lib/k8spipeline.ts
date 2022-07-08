import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import eks = require('@aws-cdk/aws-eks');
import * as iam from '@aws-cdk/aws-iam';
import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import targets = require('@aws-cdk/aws-events-targets');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');

export interface k8sPipelineProps {
    eksRepo: codecommit.IRepository,
};

export class k8spipeline extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: k8sPipelineProps) {
        super(scope, id);

        const projectK8s = new codebuild.Project(this, 'K8sProject', {
            projectName: 'k8sProject',
            source: codebuild.Source.codeCommit({
                repository: props.eksRepo
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                privileged: true,
            },
            role: iam.Role.fromRoleArn(this, 'buildrole1', 'arn:aws:iam::790359191027:role/adminrole'),
            buildSpec: codebuild.BuildSpec.fromSourceFilename('k8sBuild.yaml'),
        });

        const projectSwap = new codebuild.Project(this, 'swapProject', {
            projectName: 'swapProject',
            source: codebuild.Source.codeCommit({
                repository: props.eksRepo
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                privileged: true,
            },
            role: iam.Role.fromRoleArn(this, 'buildrole3', 'arn:aws:iam::790359191027:role/adminrole'),
            buildSpec: codebuild.BuildSpec.fromSourceFilename('swapBuild.yaml'),
        });

        const sourceOutput = new codepipeline.Artifact();

        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: props.eksRepo,
            output: sourceOutput,
          });

        const buildActionK8s = new codepipeline_actions.CodeBuildAction({
            actionName: 'DeployK8sApp',
            project: projectK8s,
            input: sourceOutput,
        });

        const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'ApproveToSwitch',
          });

        const buildActionSwap = new codepipeline_actions.CodeBuildAction({
            actionName: 'BlueGreeSwap',
            project: projectSwap,
            input: sourceOutput,
        });

        new codepipeline.Pipeline(this, 'EksPipeline', {
            role: iam.Role.fromRoleArn(this, 'pipelinerole', 'arn:aws:iam::790359191027:role/adminrole'),
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'BuildAndDeployK8sApp',
                    actions: [buildActionK8s],
                },
                {
                    stageName: 'ApproveSwitch',
                    actions: [manualApprovalAction],
                },
                {
                    stageName: 'BlueGreenSwap',
                    actions: [buildActionSwap],
                },
            ],
        });

     //   props.k8sRepo.onCommit('OnCommit', {
     //       target: new targets.CodeBuildProject(projectK8s),
     //     });
    }
}