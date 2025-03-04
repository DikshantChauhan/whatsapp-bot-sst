import {
  Entity,
  number,
  schema,
  string,
  Table,
  map,
  GetItemResponse,
  record,
} from "dynamodb-toolbox";
import documentClient from "./config";
import { Resource } from "sst";

const TABLE_NAME = Resource["whatsapp-bot-dev-user"].name;

const table = new Table({
  name: TABLE_NAME,
  partitionKey: {
    name: "phone_number",
    type: "string",
  },
  documentClient,
});

const userEntitySchema = schema({
  phone_number: string().key(),
  name: string(),
  level_id: string(),
  node_id: string(),
  node_meta: map({
    delay_wait_till_unix: number().optional(),
    prompt_input: string().optional(),
  })
    .optional()
    .default({}),
  nudge_id: string(),
  session_expires_at: number(),
  campaign_id: string(),
  total_score: number().default(0),
  level_score: record(string(), number()).default({}),
  age: number().optional(),
});

const userEntity = new Entity({
  table,
  name: TABLE_NAME,
  schema: userEntitySchema,
});

export type User = Exclude<
  GetItemResponse<typeof userEntity>["Item"],
  undefined
>;

export default { table, entity: userEntity };
