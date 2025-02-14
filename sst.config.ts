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
    const userTable = new sst.aws.Dynamo("whatsapp-bot-dev-user", {
      fields: {
        phone_number: "string",
      },
      primaryIndex: { hashKey: "phone_number" },
    });

    const campaignTable = new sst.aws.Dynamo("whatsapp-bot-dev-campaign", {
      fields: {
        id: "string",
      },
      primaryIndex: { hashKey: "id" },
    });

    const flowTable = new sst.aws.Dynamo("whatsapp-bot-dev-flow", {
      fields: {
        id: "string",
        type: "string",
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byType: {
          hashKey: "type",
        },
      },
    });

    const api = new sst.aws.ApiGatewayV2("ApiGateway");

    const lambda = new sst.aws.Function("MainLambda", {
      handler: "src/index.handler",
      timeout: "30 seconds",
      link: [userTable, campaignTable, flowTable],
    });

    api.route("ANY /{proxy+}", lambda.arn);
  },
});
