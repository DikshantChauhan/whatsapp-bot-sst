import DbService from "./db.service";
import nudgeDb, { Nudge, nudgeTableKeyHelper } from "../../db/nudge.db";
import { QueryCommand } from "dynamodb-toolbox";

class NudgeService {
  db = new DbService(nudgeDb.entity, nudgeDb.table);

  async create(payload: Nudge): Promise<Nudge> {
    console.log("creating nudge", payload);
    await this.deleteByUserId(payload.user_id);

    return await this.db.insert(payload);
  }

  async getByUserId(user_id: string): Promise<Nudge[]> {
    const result = await this.db.table
      .build(QueryCommand)
      .query({
        index: "byUserId",
        partition: user_id,
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

  async deleteByUserId(user_id: string): Promise<void> {
    const nudges = await this.getByUserId(user_id);
    await Promise.all(nudges.map((nudge) => this.db.delete(nudge)));
  }

  async deleteByUserIdSafe(user_id: string): Promise<void> {
    try {
      await this.deleteByUserId(user_id);
    } catch (error) {
      console.error(error);
    }
  }

  async scanAll(): Promise<Nudge[]> {
    return (await this.db.scanAll()) || [];
  }
}

export const nudgeService = new NudgeService();
