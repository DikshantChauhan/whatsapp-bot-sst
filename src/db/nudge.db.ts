import {
  Entity,
  GetItemResponse,
  number,
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
    name: "pk",
    type: "string",
  },
  sortKey: {
    name: "sk",
    type: "string",
  },
  indexes: {
    byUserPhoneNumber: {
      partitionKey: {
        name: "user_phone_number",
        type: "string",
      },
      type: "global",
    },
    byReminderTimeUnix: {
      type: "local",
      sortKey: {
        name: "reminder_time_unix",
        type: "number",
      },
    },
  },
  documentClient,
});

const nudgeEntitySchema = schema({
  user_phone_number: string().key(),
  reminder_time_unix: number().key(),
  nudge_id: string(),
  node_id: string(),
});

export const nudgeTableKeyHelper = (reminder_time_unix: number) => {
  const date = new Date(reminder_time_unix);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const minutes = Math.floor(reminder_time_unix / 1000 / 60);

  const data = {
    pk: `${year}/${month}/${day}`,
    sk: {
      minutes,
      getSk: (minutes: number, user_phone_number: string) =>
        `${minutes}#${user_phone_number}`,
    },
  };

  return data;
};

const nudgeEntity = new Entity({
  table,
  name: TABLE_NAME,
  schema: nudgeEntitySchema,
  computeKey: ({ reminder_time_unix, user_phone_number }) => {
    const { pk, sk } = nudgeTableKeyHelper(reminder_time_unix);

    return {
      pk,
      sk: sk.getSk(sk.minutes, user_phone_number),
    };
  },
});

export type Nudge = Exclude<
  GetItemResponse<typeof nudgeEntity>["Item"],
  undefined
>;

export default { table, entity: nudgeEntity };
