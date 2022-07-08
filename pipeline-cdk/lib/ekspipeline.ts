import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import eks = require('@aws-cdk/aws-eks');
import * as iam from '@aws-cdk/aws-iam';
import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import targets = require('@aws-cdk/aws-events-targets');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');

export interface eksPipelineProps {
    eksRepo: codecommit.IRepository,
};

export class ekspipeline extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: eksPipelineProps) {
        super(scope, id);

        const projectEks = new codebuild.Project(this, 'EksProject', {
            projectName: 'eksProject',
            source: codebuild.Source.codeCommit({
                repository: props.eksRepo
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                privileged: true,
            },
            role: iam.Role.fromRoleArn(this, 'buildrole2', 'arn:aws:iam::790359191027:role/adminrole'),
            buildSpec: codebuild.BuildSpec.fromSourceFilename('eksBuild.yaml'),
        });

        const sourceOutput = new codepipeline.Artifact();

        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: props.eksRepo,
            output: sourceOutput,
          });
        
          const buildActionEks = new codepipeline_actions.CodeBuildAction({
            actionName: 'DeployEksCluster',
            project: projectEks,
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
                    stageName: 'BuildAndDeployEksCluster',
                    actions: [buildActionEks],
                },
            ],
        });

     //   props.k8sRepo.onCommit('OnCommit', {
     //       target: new targets.CodeBuildProject(projectK8s),
     //     });
    }
}