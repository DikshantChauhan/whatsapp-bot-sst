import userDb, { User } from "../../db/user.db";
import DbService from "./db.service";
import { z } from "zod";

class UserService {
  db = new DbService(userDb.entity, userDb.table);

  async update(
    phone_number: string,
    payload: Partial<Omit<User, "phone_number">>
  ): Promise<User> {
    return this.db.updateAndGet({ phone_number }, { ...payload, phone_number });
  }

  async scanAll(): Promise<User[]> {
    const users = await this.db.scanAll();
    return users ?? [];
  }

  async createPayloadSchema() {
    return z.object({
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
  }

  async create(payload: User): Promise<User> {
    return await this.db.insert(payload);
  }

  async get(phone_number: string): Promise<User | undefined> {
    return await this.db.get({ phone_number });
  }
}

export const userService = new UserService();
