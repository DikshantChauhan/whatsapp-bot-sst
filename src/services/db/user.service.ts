import userDb from "../../db/user.db";
import DbService from "./db.service";
import { PutItemInput, UpdateItemInput } from "dynamodb-toolbox";
import { z } from "zod";

type UE = typeof userDb.entity;
type UT = typeof userDb.table;

class UserService extends DbService<UE, UT> {
  constructor() {
    super(userDb.entity, userDb.table);
  }

  public async update(payload: {
    [K in keyof UpdateItemInput<UE>]: Extract<
      UpdateItemInput<UE>[K],
      string | number | boolean
    >;
  }) {
    const curr = await this.get({ phone_number: payload.phone_number });
    if (!curr) throw new Error("User not found");

    const update: UpdateItemInput<UE> = { ...payload };

    return await super.update(update, { phone_number: payload.phone_number });
  }

  public async scanAll() {
    const users = await super.scanAll();

    return users;
  }

  private async putItemValidator(payload: PutItemInput<UE>) {
    const schema = z.object({
      phone_number: z.string(),
      name: z.string(),
      level_id: z.string(),
      node_id: z.string(),
      campaign_id: z.string(),
      nudge_id: z.string(),
      session_expires_at: z.number(),
      node_meta: z
        .object({
          delayWaitTill: z.number().optional(),
        })
        .optional(),
    });

    const result = await schema.parseAsync(payload);
    return result;
  }

  public async createAndValidate(payload: PutItemInput<UE>) {
    const input = await this.putItemValidator(payload);
    const user = await this.insert(input);

    return user;
  }
}

export const userService = new UserService();
