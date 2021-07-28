import { Construct, Stack, StackProps, SecretValue } from "@aws-cdk/core";
import * as CodePipelineAction from "@aws-cdk/aws-codepipeline-actions";
import * as CodeBuild from "@aws-cdk/aws-codebuild";
import * as CodePipeline from "@aws-cdk/aws-codepipeline";
import {
  BlockPublicAccess,
  Bucket,
  HttpMethods,
  IBucket,
} from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";

export class FrontendPipelineStack extends Stack {
  constructor(app: Construct, stackId: string, props?: StackProps) {
    super(app, stackId, props);

    const bucketWebsite: IBucket = new Bucket(
      this,
      "ConnectoFrontendBucketId",
      {
        bucketName: "connecto-frontend-bucket",
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }
    );

    new cloudfront.Distribution(this, "bucketWebsiteCDN", {
      defaultBehavior: { origin: new origins.S3Origin(bucketWebsite) },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    const outputSources = new CodePipeline.Artifact();
    const outputWebsite = new CodePipeline.Artifact();

    const pipeline = new CodePipeline.Pipeline(
      this,
      "ConnectoFrontendPipelineId",
      {
        pipelineName: "connecto-frontend-pipeline",
        restartExecutionOnUpdate: true,
      }
    );

    pipeline.addStage({
      stageName: "Source",
      actions: [
        new CodePipelineAction.GitHubSourceAction({
          actionName: "Checkout",
          owner: "zeroandoneme",
          repo: "devops_lab_react_app",
          branch: "master",
          oauthToken: SecretValue.secretsManager("github_token"),
          output: outputSources,
          trigger: CodePipelineAction.GitHubTrigger.WEBHOOK,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodePipelineAction.CodeBuildAction({
          actionName: "Repo_Build",
          project: new CodeBuild.PipelineProject(this, "BuildFEId", {
            buildSpec:
              CodeBuild.BuildSpec.fromSourceFilename("./buildspec.yml"),
          }),
          input: outputSources,
          outputs: [outputWebsite],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new CodePipelineAction.S3DeployAction({
          actionName: "Website",
          input: outputWebsite,
          bucket: bucketWebsite,
        }),
      ],
    });
  }
}
