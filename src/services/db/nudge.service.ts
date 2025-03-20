import DbService from "./db.service";
import nudgeDb, { Nudge, nudgeTableKeyHelper } from "../../db/nudge.db";
import { QueryCommand } from "dynamodb-toolbox";

class NudgeService {
  db = new DbService(nudgeDb.entity, nudgeDb.table);

  async create(payload: Nudge): Promise<Nudge> {
    await this.deleteByUserPhoneNumber(payload.user_phone_number);

    return await this.db.insert(payload);
  }

  async getByUserPhoneNumber(phone_number: string): Promise<Nudge[]> {
    const result = await this.db.table
      .build(QueryCommand)
      .query({
        index: "byUserPhoneNumber",
        partition: phone_number,
      })
      .entities(this.db.entity)
      .send();

    return (result.Items || []) as Nudge[];
  }

  async getPastNudges(greaterThanUnix: number, limit: number) {
    const { pk } = nudgeTableKeyHelper(greaterThanUnix);
    const result = await this.db.table
      .build(QueryCommand)
      .query({
        index: "byReminderTimeUnix",
        partition: pk,
        range: {
          lte: greaterThanUnix,
        },
      })
      .entities(this.db.entity)
      .options({ limit })
      .send();

    return (result.Items || []) as Nudge[];
  }

  async deleteByUserPhoneNumber(phone_number: string): Promise<void> {
    const nudges = await this.getByUserPhoneNumber(phone_number);
    await Promise.all(nudges.map((nudge) => this.db.delete(nudge)));
  }

  async scanAll(): Promise<Nudge[]> {
    return (await this.db.scanAll()) || [];
  }
}

export const nudgeService = new NudgeService();
