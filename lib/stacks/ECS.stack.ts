import { Construct, Stack, StackProps } from "@aws-cdk/core";
import {
  PolicyStatement,
  Role,
  ServicePrincipal,
  Effect,
} from "@aws-cdk/aws-iam";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";

export class ECSStack extends Stack {
  constructor(app: Construct, stackId: string, props?: StackProps) {
    super(app, stackId, props);

    // Create Execution Role for task definition
    const executionRole = new Role(this, "ExecutionRoleId", {
      roleName: "executionRole",
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: [
          "logs:CreateLogStream",
          "ecs:*",
          "ecr:*",
          "logs:PutLogEvents",
        ],
      })
    );

    // Get VPC
    const vpc = ec2.Vpc.fromLookup(this, "VpcId", {
      isDefault: true,
      vpcId: "vpc-id",
    });

    // Get Security Group
    const securityGroup = ec2.SecurityGroup.fromLookup(this, "SgId", "sg-id");

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, "ConnectoClusterId", {
      vpc,
      clusterName: "connecto-cluster",
    });

    // Create Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "ConnectoTaskDefId",
      {
        executionRole: executionRole,
        cpu: 512,
        memoryLimitMiB: 2048,
      }
    );

    // Add Container to task defenition
    taskDefinition.addContainer("ConnectoContainerId", {
      image: ecs.ContainerImage.fromRegistry(
        `${props?.env?.account}.dkr.ecr.${props?.env?.region}.amazonaws.com/connecto-repo-v1:latest`
      ),
      memoryLimitMiB: 2048,
      containerName: "connecto-container",
      portMappings: [{ containerPort: 5000 }],
    });

    // Create Fargate Service
    const service = new ecs.FargateService(this, "ConnectoServiceId", {
      serviceName: "connecto-service",
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
    });

    /**
     * The below is optional
     * if you have a load balancer, so you don't need to create a new one
     */

    // Create Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, "ConnectoLBId", {
      loadBalancerName: "connecto-lb",
      vpc,
      internetFacing: true,
    });
    const listener = lb.addListener("Listener", { port: 80 });

    // Create Test Target Group
    const targetGroup2 = listener.addTargets("TestTgId", {
      targetGroupName: "testTargetGroup",
      port: 8080,
      targets: [],
    });

    // Create Prod Target Group
    const targetGroup1 = listener.addTargets("ProdTgId", {
      targetGroupName: "prodTargetGroup",
      port: 80,
      targets: [service],
    });
  }
}
