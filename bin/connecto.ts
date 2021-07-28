#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";

import { FrontendPipelineStack } from "../lib/stacks/frontendPipeline.stack";

const app = new cdk.App();
const envEUDev = { account: "157000482341", region: "eu-west-1" };

new FrontendPipelineStack(app, "FrontendPipelineStack", { env: envEUDev });
