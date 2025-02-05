import { Entity, number, schema, string, Table, map } from "dynamodb-toolbox";
import documentClient from "./config";
import { Resource } from "sst";
import { SubFlowValue } from "../services/flow/typings";

const table = new Table({
  partitionKey: {
    name: "phoneNumber",
    type: "string",
  },
  name: Resource.DynoUser.name,
  documentClient,
});

const entity = new Entity({
  table,
  name: Resource.DynoUser.name,

  schema: schema({
    phoneNumber: string().key(),
    sessionExpiresAt: number(),
    name: string(),
    flowId: string(),
    validatorSubFlowId: string().optional(),

    currentNodeId: string(),
    currentNodeMeta: map({
      delayWaitTill: number().optional(),
    })
      .optional()
      .default({}),

    nudgeSubFlowId: string().optional(),
    nudgeNodeMeta: map({
      delayWaitTill: number().optional(),
    })
      .optional()
      .default({}),
  }),
});

export interface User {
  phoneNumber: string;
  sessionExpiresAt: number;
  name: string;
  currentNodeId: string;
  flowId: string;
  nudgeSubFlowId?: SubFlowValue;
  validatorSubFlowId?: SubFlowValue;
  currentNodeMeta?: {
    delayWaitTill?: number;
  };
  nudgeNodeMeta?: {
    delayWaitTill?: number;
  };
}

export default { table, entity };
