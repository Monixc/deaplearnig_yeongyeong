#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CrawlerStack } from "../lib/crawler-stack";

const app = new cdk.App();

new CrawlerStack(app, "MovieMusicCrawlerStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "ap-northeast-2",
  },
});
