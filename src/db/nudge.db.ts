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

const TABLE_NAME = Resource["whatsapp-bot-dev-nudge"].name;

const table = new Table({
  name: TABLE_NAME,
  partitionKey: {
    name: "yyyymmdd",
    type: "string",
  },
  sortKey: {
    name: "mins",
    type: "string",
  },
  documentClient,
});

const nudgeEntitySchema = schema({
  yyyymmdd: string().key(),
  mins: string().key(),
  data: map({
    nodes: list(any()).default([]),
    edges: list(any()).default([]),
  }),
});

const nudgeEntity = new Entity({
  table,
  name: TABLE_NAME,
  schema: nudgeEntitySchema,
});

export type Nudge = Exclude<
  GetItemResponse<typeof nudgeEntity>["Item"],
  undefined
>;

export default { table, entity: nudgeEntity };
