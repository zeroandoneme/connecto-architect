#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";

import { FrontendPipelineStack } from "../lib/stacks/frontendPipeline.stack";

const app = new cdk.App();
const env = { account: "account_id", region: "region" };

new FrontendPipelineStack(app, "FrontendPipelineStack", { env });
