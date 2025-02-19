import { z } from "zod";
import campaignDb, { Campaign } from "../../db/campaign.db";
import DbService from "./db.service";
import { generateDBId } from "../../utils";

class CampaignService {
  db = new DbService(campaignDb.entity, campaignDb.table);

  createPayloadSchema() {
    return z.object({
      name: z.string(),
      allowed_nodes: z.array(z.string()),
      levels: z.array(z.string()),
    });
  }

  updatePayloadSchema() {
    return this.createPayloadSchema().partial();
  }

  async update(
    id: string,
    payload: Partial<Omit<Campaign, "id">>
  ): Promise<Campaign> {
    return await this.db.updateAndGet({ id }, { ...payload, id });
  }

  async scanAll(): Promise<Campaign[]> {
    return (await this.db.scanAll()) ?? [];
  }

  async create(payload: Omit<Campaign, "id">): Promise<Campaign> {
    return await this.db.insert({
      ...payload,
      id: generateDBId(),
    });
  }

  async getOrFail(id: string): Promise<Campaign> {
    return await this.db.getOrFail({ id });
  }
}

export const campaignService = new CampaignService();
