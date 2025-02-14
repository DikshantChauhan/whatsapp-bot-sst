import {
  any,
  Entity,
  list,
  map,
  schema,
  string,
  Table,
} from "dynamodb-toolbox";
import documentClient from "./config";
import { Resource } from "sst";

const TABLE_NAME = Resource["whatsapp-bot-dev-dyno-flow"].name;

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
    nodes: list(
      map({
        id: string(),
        type: string(),
        data: any(),
        nudge: string(),
      })
    ).default([]),
    edges: list(
      map({
        id: string(),
        source: string(),
        target: string(),
        sourceHandle: string().optional(),
        targetHandle: string().optional(),
      })
    ).default([]),
  }),
});

const flowEntity = new Entity({
  table,
  name: TABLE_NAME,
  schema: flowEntitySchema,
});

export default { table, entity: flowEntity };
