import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';

export class EksCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'eks-vpc', {
      vpcId: this.node.tryGetContext('eks-vpc'),
    });
    
    const albSg = new ec2.SecurityGroup(this, 'Alb-Sg', {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: 'Alb-Sg',
    });

    albSg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80), 'http');
    albSg.addIngressRule(albSg, ec2.Port.allTraffic());

    const masterrole = iam.Role.fromRoleArn(this, 'masterRole', this.node.tryGetContext('master-role-arn'));

    // create the eks cluster
    const cluster = new eks.FargateCluster(this, 'demo-fargate-cluster', {
      version: eks.KubernetesVersion.V1_20,
      clusterName: this.node.tryGetContext('eks-cluster-name'),
      vpc: vpc,
      mastersRole: masterrole,
      vpcSubnets: [
        { subnetType: ec2.SubnetType.PRIVATE }
      ],
    });

    cluster.clusterSecurityGroup.addIngressRule(albSg, ec2.Port.tcp(80), 'http');

    // create a fargate profile for the application
    new eks.FargateProfile(this, 'AppProfile', {
      cluster: cluster,
      selectors: [
        {namespace: this.node.tryGetContext('app-name-space')},
      ],
      vpc: vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE },
    });
    
    // enable 
    new iam.FederatedPrincipal(
      cluster.openIdConnectProvider.openIdConnectProviderArn,
      {},
      'sts:AssumeRoleWithWebIdentity'
    );
    
    // create a service account for alb
    const awsLbControllerServiceAccount = cluster.addServiceAccount(
      'aws-load-balancer-controller',
      {
        name: 'aws-load-balancer-controller',
        namespace: 'kube-system',
      }
    );

    const lbEc2PolicyStatements = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:DescribeAvailabilityZones',
          'ec2:GetCoipPoolUsage',
          'ec2:CreateSecurityGroup',
          'ec2:CreateTags',
          'ec2:DeleteTags',
          'ec2:DeleteSecurityGroup',
          'ec2:DescribeAccountAttributes',
          'ec2:DescribeAddresses',
          'ec2:DescribeInstances',
          'ec2:DescribeInstanceStatus',
          'ec2:DescribeInternetGateways',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DescribeSecurityGroups',
         'ec2:DescribeSubnets',
          'ec2:DescribeTags',
          'ec2:DescribeVpcs',
          'ec2:ModifyInstanceAttribute',
          'ec2:ModifyNetworkInterfaceAttribute',
          'ec2:RevokeSecurityGroupIngress',
      ],
      resources: ['*'],
  });

    const lbElbPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'elasticloadbalancing:AddListenerCertificates',
            'elasticloadbalancing:AddTags',
            'elasticloadbalancing:CreateListener',
            'elasticloadbalancing:CreateLoadBalancer',
            'elasticloadbalancing:CreateRule',
            'elasticloadbalancing:CreateTargetGroup',
            'elasticloadbalancing:DeleteListener',
            'elasticloadbalancing:DeleteLoadBalancer',
            'elasticloadbalancing:DeleteRule',
            'elasticloadbalancing:DeleteTargetGroup',
            'elasticloadbalancing:DeregisterTargets',
            'elasticloadbalancing:DescribeListenerCertificates',
            'elasticloadbalancing:DescribeListeners',
            'elasticloadbalancing:DescribeLoadBalancers',
            'elasticloadbalancing:DescribeLoadBalancerAttributes',
            'elasticloadbalancing:DescribeRules',
            'elasticloadbalancing:DescribeSSLPolicies',
            'elasticloadbalancing:DescribeTags',
            'elasticloadbalancing:DescribeTargetGroups',
            'elasticloadbalancing:DescribeTargetGroupAttributes',
            'elasticloadbalancing:DescribeTargetHealth',
            'elasticloadbalancing:ModifyListener',
            'elasticloadbalancing:ModifyLoadBalancerAttributes',
            'elasticloadbalancing:ModifyRule',
            'elasticloadbalancing:ModifyTargetGroup',
            'elasticloadbalancing:ModifyTargetGroupAttributes',
            'elasticloadbalancing:RegisterTargets',
            'elasticloadbalancing:RemoveListenerCertificates',
            'elasticloadbalancing:RemoveTags',
            'elasticloadbalancing:SetIpAddressType',
            'elasticloadbalancing:SetSecurityGroups',
            'elasticloadbalancing:SetSubnets',
            'elasticloadbalancing:SetWebAcl',
        ],
        resources: ['*'],
    });

    const lbIamPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'iam:CreateServiceLinkedRole',
            'iam:GetServerCertificate',
            'iam:ListServerCertificates',
        ],
        resources: ['*'],
    });

    const lbCognitoPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:DescribeUserPoolClient'],
        resources: ['*'],
    });

    const lbWafRegPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'waf-regional:GetWebACLForResource',
            'waf-regional:GetWebACL',
            'waf-regional:AssociateWebACL',
            'waf-regional:DisassociateWebACL',
        ],
        resources: ['*'],
    });

    const lbTagPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['tag:GetResources', 'tag:TagResources'],
        resources: ['*'],
    });

    const lbWafPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['waf:GetWebACL'],
        resources: ['*'],
    });

    const lbWafv2PolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'wafv2:GetWebACL',
            'wafv2:GetWebACLForResource',
            'wafv2:AssociateWebACL',
            'wafv2:DisassociateWebACL',
        ],
        resources: ['*'],
    });

    const lbShieldPolicyStatements = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'shield:DescribeProtection',
            'shield:GetSubscriptionState',
            'shield:DeleteProtection',
            'shield:CreateProtection',
            'shield:DescribeSubscription',
            'shield:ListProtections',
        ],
        resources: ['*'],
    });

    const acmPolicyStatements = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
          'acm:DescribeCertificate',
          'acm:ListCertificates',
          'acm:GetCertificate',
      ],
      resources: ['*'],
  });

    awsLbControllerServiceAccount.addToPrincipalPolicy(lbEc2PolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbElbPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbIamPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbCognitoPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbWafRegPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbTagPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbWafPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbWafv2PolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(lbShieldPolicyStatements);
    awsLbControllerServiceAccount.addToPrincipalPolicy(acmPolicyStatements);

    new eks.HelmChart(this, 'alb-controller', {
      chart: 'aws-load-balancer-controller',
      repository: 'https://aws.github.io/eks-charts',
      cluster: cluster,
      namespace: 'kube-system',
      values: {
        clusterName: cluster.clusterName,
        region: this.node.tryGetContext('aws-region'),
        vpcId: vpc.vpcId,
        serviceAccount: {
          create: false,
          name: awsLbControllerServiceAccount.serviceAccountName,
        },
      },
    }); 
  }
}
