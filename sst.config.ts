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
        id: "string",
      },
      primaryIndex: { hashKey: "phone_number" },
      globalIndexes: {
        byId: {
          hashKey: "id",
        },
      },
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

    const nudgeTable = new sst.aws.Dynamo("whatsapp-bot-dev-nudge", {
      fields: {
        pk: "string",
        sk: "string",
        user_phone_number: "string",
        reminder_time_unix: "number",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        byUserPhoneNumber: {
          hashKey: "user_phone_number",
        },
      },
      localIndexes: {
        byReminderTimeUnix: {
          rangeKey: "reminder_time_unix",
        },
      },
    });

    const api = new sst.aws.ApiGatewayV2("ApiGateway");

    const lambda = new sst.aws.Function("MainLambda", {
      handler: "src/index.handler",
      timeout: "30 seconds",
      link: [userTable, campaignTable, flowTable, nudgeTable],
    });

    api.route("ANY /{proxy+}", lambda.arn);
  },
});
