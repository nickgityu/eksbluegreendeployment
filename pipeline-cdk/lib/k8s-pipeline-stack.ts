import * as cdk from '@aws-cdk/core';
import { k8spipeline } from './k8spipeline';
import codecommit = require('@aws-cdk/aws-codecommit');

export class K8sPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new k8spipeline(this, 'k8spipeline', {
      eksRepo: codecommit.Repository.fromRepositoryName(this, 'k8sdemo', 'k8sdemo'),
    }); 
  }
}
