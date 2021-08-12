import {
  Construct,
  Stack,
  PhysicalName,
  RemovalPolicy,
  StackProps,
} from "@aws-cdk/core";
import {
  PolicyStatement,
  Role,
  ServicePrincipal,
  Effect,
} from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as CodePipelineAction from "@aws-cdk/aws-codepipeline-actions";
import * as CodeBuild from "@aws-cdk/aws-codebuild";
import * as CodePipeline from "@aws-cdk/aws-codepipeline";
import * as ecr from "@aws-cdk/aws-ecr";

export class BackendPipelineStack extends Stack {
  constructor(app: Construct, stackId: string, props?: StackProps) {
    super(app, stackId, props);

    const repoName = "connecto-repo";

    // Create ECR
    new ecr.Repository(this, "ConnectoRepoV1Id", {
      repositoryName: repoName,
    });

    // Create Role for code build
    const role = new Role(this, "codeBuildRoleId", {
      roleName: "codeBuildRole",
      assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
    });

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: [
          "ecr:CompleteLayerUpload",
          "ecr:GetAuthorizationToken",
          "ecr:UploadLayerPart",
          "ecr:InitiateLayerUpload",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
        ],
      })
    );

    // Create Pipeline
    const sourceOutput = new CodePipeline.Artifact();

    const artifactBucket = new s3.Bucket(this, "connecto-backend", {
      bucketName: PhysicalName.GENERATE_IF_NEEDED,
      blockPublicAccess: new s3.BlockPublicAccess(
        s3.BlockPublicAccess.BLOCK_ALL
      ),
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const pipeline = new CodePipeline.Pipeline(this, "ConnectoPipeline", {
      pipelineName: "connecto-backend-pipeline",
      restartExecutionOnUpdate: true,
      artifactBucket: artifactBucket,
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [
        new CodePipelineAction.GitHubSourceAction({
          actionName: "Checkout",
          owner: "zeroandoneme",
          repo: "connecto-backend",
          branch: "master",
          //@ts-ignore
          oauthToken: "******",
          output: sourceOutput,
          trigger: CodePipelineAction.GitHubTrigger.WEBHOOK,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodePipelineAction.CodeBuildAction({
          environmentVariables: {
            DEPLOYMENT_BUCKET: {
              value: artifactBucket.bucketName,
              type: CodeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            },
          },
          actionName: "Repo_Build",
          project: new CodeBuild.PipelineProject(this, "BuildBE", {
            role: role,
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename("buildspec.yml"),
            environment: {
              buildImage: CodeBuild.LinuxBuildImage.STANDARD_4_0,
              privileged: true,
              environmentVariables: {
                AWS_ACCOUNT_ID: {
                  value: props?.env?.account,
                },
                AWS_REGION: {
                  value: props?.env?.region,
                },
                IMAGE_REPO_NAME: {
                  value: repoName,
                },

                DOCKER_USERNAME: {
                  value: "docker_username",
                },

                DOCKER_PASSWORD: {
                  value: "docker_pass",
                },
              },
            },
          }),
          input: sourceOutput,
        }),
      ],
    });
  }
}
