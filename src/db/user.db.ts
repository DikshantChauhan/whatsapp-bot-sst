import {
  Entity,
  number,
  schema,
  string,
  Table,
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
  current_level_id: string(),
  current_node_id: string(),
  current_nudge_id: string().optional(),
  session_expires_at: number(),
  current_campaign_id: string(),
  total_score: number().default(0),
  current_level_score: record(string(), number()).default({}),
  max_level_id: string(),
  age: number().optional(),

  //nodes meta
  delay_wait_till_unix: number().optional(),
  prompt_input: string().optional(),
  whatsapp_ownboarding_school_name: string().optional(),
  whatsapp_ownboarding_dise_code: string().optional(),
  whatsapp_ownboarding_district_id: string().optional(),
  whatsapp_ownboarding_district_name: string().optional(),
  whatsapp_ownboarding_state_name: string().optional(),
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
