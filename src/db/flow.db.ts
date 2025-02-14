import {
  any,
  Entity,
  GetItemResponse,
  list,
  map,
  schema,
  string,
  Table,
} from "dynamodb-toolbox";
import documentClient from "./config";
import { Resource } from "sst";

const TABLE_NAME = Resource["whatsapp-bot-dev-flow"].name;

const table = new Table({
  name: TABLE_NAME,
  partitionKey: {
    name: "id",
    type: "string",
  },
  indexes: {
    byType: {
      partitionKey: {
        name: "type",
        type: "string",
      },
      type: "global",
    },
  },
  documentClient,
});

export const FlowType = ["level", "nudge"] as const;
const flowEntitySchema = schema({
  id: string().key(),
  name: string(),
  type: string().enum(...FlowType),
  data: map({
    nodes: list(map(any())).default([]),
    edges: list(map(any())).default([]),
  }),
});

const flowEntity = new Entity({
  table,
  name: TABLE_NAME,
  schema: flowEntitySchema,
});

export type Flow = Exclude<
  GetItemResponse<typeof flowEntity>["Item"],
  undefined
>;

export default { table, entity: flowEntity };
