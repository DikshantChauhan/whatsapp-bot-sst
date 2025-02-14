import { Entity, schema, string, Table, list } from "dynamodb-toolbox";
import documentClient from "./config";
import { Resource } from "sst";

const TABLE_NAME = Resource["whatsapp-bot-dev-dyno-campaign"].name;

const table = new Table({
  name: TABLE_NAME,
  partitionKey: {
    name: "id",
    type: "string",
  },
  documentClient,
});

const campaignEntitySchema = schema({
  id: string().key(),
  name: string(),
  allowed_nodes: list(string()).default([]),
  levels: list(string()).default([]),
});

const campaignEntity = new Entity({
  table,
  name: TABLE_NAME,
  schema: campaignEntitySchema,
});

export default { table, entity: campaignEntity };
