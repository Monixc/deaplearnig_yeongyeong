#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CrawlerStack } from "../lib/crawler-stack";

const app = new cdk.App();

new CrawlerStack(app, "MovieMusicCrawlerStack", {
  env: {
    account:
      process.env.CDK_DEFAULT_ACCOUNT || process.env.REACT_APP_ACCOUNT_ID,
    region: "ap-northeast-2",
  },
});
