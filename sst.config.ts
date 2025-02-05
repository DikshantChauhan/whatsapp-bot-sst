/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "whatsapp-bot-sst",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("S3Bucket", {
      access: "public",
    });

    // User Table
    const userTable = new sst.aws.Dynamo("DynoUser", {
      fields: {
        phoneNumber: "string",
      },
      primaryIndex: { hashKey: "phoneNumber" }, // Primary Index
    });

    // Activity Logs Table
    // const activityLogsTable = new sst.aws.Dynamo("DynoActivityLogs", {
    //   fields: {
    //     userEmail: "string",
    //     timestamp: "number",
    //   },
    //   primaryIndex: { hashKey: "userEmail", rangeKey: "timestamp" }, // Primary Index
    // });

    const api = new sst.aws.ApiGatewayV2("ApiGateway");

    const lambda = new sst.aws.Function("MainLambda", {
      handler: "src/index.handler",
      timeout: "30 seconds",
      // link: [userTable, activityLogsTable, bucket],
      link: [userTable, bucket],
    });

    api.route("ANY /{proxy+}", lambda.arn);
  },
});
