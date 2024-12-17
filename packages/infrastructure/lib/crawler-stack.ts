import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class CrawlerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC 생성
    const vpc = new ec2.Vpc(this, "CrawlerVPC", {
      maxAzs: 2, // 가용영역 2개 사용
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // S3 버킷 생성
    const dataBucket = new s3.Bucket(this, "MovieMusicData", {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // DynamoDB 테이블 생성
    const movieTable = new dynamodb.Table(this, "MovieTable", {
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "songId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ECR 레포지토리
    const repository = new ecr.Repository(this, "CrawlerRepo", {
      repositoryName: "movie-music-crawler",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ECS Fargate 클러스터
    const cluster = new ecs.Cluster(this, "CrawlerCluster", {
      clusterName: "movie-music-crawler",
      containerInsights: true,
      vpc: vpc,
    });

    // 태스크 실행 역할
    const taskRole = new iam.Role(this, "CrawlerTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // 권한 추가
    dataBucket.grantReadWrite(taskRole);
    movieTable.grantReadWriteData(taskRole);

    // Fargate 태스크 정의
    const taskDefinition = new ecs.FargateTaskDefinition(this, "CrawlerTask", {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    // 컨테이너 정의
    taskDefinition.addContainer("CrawlerContainer", {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "crawler" }),
      environment: {
        BUCKET_NAME: dataBucket.bucketName,
        TABLE_NAME: movieTable.tableName,
      },
    });

    // EventBridge 규칙 생성 (매일 자정에 실행)
    new events.Rule(this, "DailyCrawlerRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "0" }),
      targets: [
        new targets.EcsTask({
          cluster,
          taskDefinition,
          taskCount: 1,
          subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          securityGroups: [
            new ec2.SecurityGroup(this, "CrawlerSecurityGroup", {
              vpc,
              allowAllOutbound: true,
              description: "Security group for crawler task",
            }),
          ],
        }),
      ],
    });
  }
}
