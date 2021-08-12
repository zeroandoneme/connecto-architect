#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";

import { FrontendPipelineStack } from "../lib/stacks/frontendPipeline.stack";
import { BackendPipelineStack } from "../lib/stacks/backendPipeline.stack";
import { ECSStack } from "../lib/stacks/ECS.stack";

const app = new cdk.App();
const env = { account: "account_id", region: "region" };

new FrontendPipelineStack(app, "FrontendPipelineStack", { env });
new BackendPipelineStack(app, "BackendPipelineStack", { env });
new ECSStack(app, "ECSStack", { env });
