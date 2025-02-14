import { z } from "zod";
import campaignDb from "../../db/campaign.db";
import DbService from "./db.service";
import {
  UpdateItemInput,
  PutItemInput,
  KeyInputItem,
} from "dynamodb-toolbox";
import { generateDBId } from "../../utils";
import { flowService } from "./flow.service";

type E = typeof campaignDb.entity;
type T = typeof campaignDb.table;

class CampaignService extends DbService<E, T> {
  constructor() {
    super(campaignDb.entity, campaignDb.table);
  }

  public async updateAndValidate(payload: {
    [K in keyof UpdateItemInput<E>]: Extract<
      UpdateItemInput<E>[K],
      string | number | boolean
    >;
  }) {
    const result = await this.updateSchema().parseAsync(payload);
    const { id } = payload;

    if (!(await this.get({ id }))) {
      throw new Error("Campaign not found");
    }

    return await super.update(
      {
        ...result,
        id,
      },
      { id }
    );
  }

  public async scanAll() {
    return await super.scanAll();
  }

  private createSchema() {
    return z.object({
      name: z.string(),
      allowed_nodes: z.array(z.string()).optional(),
      levels: z.array(z.string()).optional(),
    });
  }

  private updateSchema() {
    return this.createSchema().partial();
  }

  public async createAndValidate(payload: Omit<PutItemInput<E>, "id">) {
    const result = await this.createSchema().parseAsync(payload);

    const campaign = await this.insert({
      ...result,
      id: generateDBId(),
    });

    return campaign;
  }

  public async getFull(key: KeyInputItem<E>) {
    const campaign = await this.get(key);
    if (!campaign) return undefined;

    const levels = await Promise.all(
      campaign.levels.map(async (id) => {
        const level = await flowService.get({ id, type: "level" });
        if (!level)
          throw new Error(`Level of id ${id} not found for campaign ${key.id}`);

        return level;
      })
    );

    return { ...campaign, levels };
  }
}

export const campaignService = new CampaignService();
