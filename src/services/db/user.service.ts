import userDb, { User } from "../../db/user.db";
import DbService from "./db.service";
import { z } from "zod";

class UserService {
  db = new DbService(userDb.entity, userDb.table);

  async update(
    phone_number: string,
    payload: Partial<Omit<User, "phone_number">>
  ): Promise<User> {
    const updatePayload = await this.updatePayloadSchema().parseAsync(payload);
    return this.db.updateAndGet(
      { phone_number },
      { ...updatePayload, phone_number }
    );
  }

  async scanAll(): Promise<User[]> {
    const users = await this.db.scanAll();
    return users ?? [];
  }

  createPayloadSchema() {
    return z.object({
      phone_number: z.string(),
      name: z.string(),
      current_level_id: z.string(),
      current_node_id: z.string(),
      current_nudge_id: z.string(),
      session_expires_at: z.number(),
      current_campaign_id: z.string(),
      total_score: z.number(),
      current_level_score: z.record(z.string(), z.number()),
      max_level_id: z.string(),
      age: z.number().optional(),

      //nodes meta
      delay_wait_till_unix: z.number().optional(),
      prompt_input: z.string().optional(),
      whatsapp_ownboarding_school_name: z.string().optional(),
      whatsapp_ownboarding_dise_code: z.string().optional(),
      whatsapp_ownboarding_district_id: z.string().optional(),
      whatsapp_ownboarding_district_name: z.string().optional(),
      whatsapp_ownboarding_state_name: z.string().optional(),
    });
  }

  updatePayloadSchema() {
    return this.createPayloadSchema().omit({ phone_number: true }).partial();
  }

  async create(payload: User): Promise<User> {
    return await this.db.insert(payload);
  }

  async get(phone_number: string): Promise<User | undefined> {
    return await this.db.get({ phone_number });
  }

  async getOrFail(phone_number: string): Promise<User> {
    return await this.getOrFail(phone_number);
  }

  async delete(phone_number: string): Promise<void> {
    await this.db.delete({ phone_number });
  }
}

export const userService = new UserService();
