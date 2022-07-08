import * as cdk from '@aws-cdk/core';
import { ekspipeline } from './ekspipeline';
import codecommit = require('@aws-cdk/aws-codecommit');

export class EksPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ekspipeline(this, 'ekspipeline', {
      eksRepo: codecommit.Repository.fromRepositoryName(this, 'eksdemo', 'eksdemo'),
    }); 
  }
}
