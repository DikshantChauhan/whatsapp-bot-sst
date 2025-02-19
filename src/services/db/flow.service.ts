import { z } from "zod";
import flowDb, { FlowType } from "../../db/flow.db";
import DbService from "./db.service";
import { QueryCommand } from "dynamodb-toolbox";
import { generateDBId } from "../../utils";
import { campaignService } from "./campaign.service";
import { Campaign } from "../../db/campaign.db";
import { Flow } from "../walkFlow/typings";

class FlowService {
  db = new DbService(flowDb.entity, flowDb.table);

  async update(id: string, payload: Partial<Omit<Flow, "id">>): Promise<Flow> {
    return (await this.db.updateAndGet({ id }, { ...payload, id })) as Flow;
  }

  async delete(id: string) {
    await this.db.delete({ id });
  }

  createPayloadSchema() {
    return z.object({
      name: z.string(),
      type: z.enum(FlowType),
      data: z.object({
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
      }),
    });
  }

  updatePayloadSchema() {
    return this.createPayloadSchema().partial();
  }

  public async create(
    campaign_id: string,
    level_number: number,
    payload: Omit<Flow, "id">
  ): Promise<{ flow: Flow; campaign?: Campaign }> {
    const type = payload.type;
    let campaign: Campaign | undefined;

    //validation for type level
    if (type === "level") {
      campaign = await campaignService.getOrFail(campaign_id);

      if (level_number < 1 || level_number > campaign.levels.length + 1) {
        throw new Error(
          "Level number must be between 1 and " + (campaign.levels.length + 1)
        );
      }
    }

    //create flow
    const flow = (await this.db.insert({
      ...payload,
      id: generateDBId(),
    })) as Flow;

    //update campaign levels and if update fails, delete the flow
    if (type === "level") {
      const updatedLevels = [...campaign!.levels];
      updatedLevels.splice(level_number - 1, 0, flow.id);
      try {
        campaign = await campaignService.update(campaign!.id, {
          levels: updatedLevels,
        });
      } catch (error) {
        await this.delete(flow.id);
        throw error;
      }
    }

    return { flow, campaign };
  }

  public async listByType(type: (typeof FlowType)[number]): Promise<Flow[]> {
    const result = await this.db.table
      .build(QueryCommand)
      .query({
        index: "byType",
        partition: type,
      })
      .entities(this.db.entity)
      .send();

    return (result.Items || []) as Flow[];
  }

  public async scanAll(): Promise<Flow[]> {
    const result = await this.db.scanAll();
    return result as Flow[];
  }

  public async getOrFail(id: string): Promise<Flow> {
    const flow = await this.db.getOrFail({ id });
    return flow as Flow;
  }
}

export const flowService = new FlowService();
