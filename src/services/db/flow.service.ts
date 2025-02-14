import { z } from "zod";
import flowDb, { FlowType } from "../../db/flow.db";
import DbService from "./db.service";
import { PutItemInput, UpdateItemInput, QueryCommand } from "dynamodb-toolbox";
import { generateDBId } from "../../utils";

type UE = typeof flowDb.entity;
type UT = typeof flowDb.table;

class FlowService extends DbService<UE, UT> {
  constructor() {
    super(flowDb.entity, flowDb.table);
  }

  public async update(payload: {
    [K in keyof UpdateItemInput<UE>]: Extract<
      UpdateItemInput<UE>[K],
      string | number | boolean
    >;
  }) {
    const curr = await this.get({ id: payload.id });
    if (!curr) throw new Error("Flow not found");

    const update: UpdateItemInput<UE> = { ...payload };

    return await super.update(update, {
      id: payload.id,
    });
  }

  public async createAndValidate(payload: Omit<PutItemInput<UE>, "id">) {
    const schema = z.object({
      name: z.string(),
      type: z.enum(FlowType),
      data: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            nudge: z.string(),
            data: z.record(z.string(), z.any()),
          })
        ),
        edges: z.array(
          z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().optional(),
            targetHandle: z.string().optional(),
          })
        ),
      }),
    });

    const result = await schema.parseAsync(payload);

    const flow = await this.insert({ ...result, id: generateDBId() });
    return flow;
  }

  public async listByType(type: string) {
    const result = await this.table
      .build(QueryCommand)
      .query({
        index: "byType",
        partition: type,
      })
      .entities(this.entity)
      .send();

    return result.Items;
  }

  public async all() {
    const result = await super.scanAll();
    return result;
  }
}

export const flowService = new FlowService();
