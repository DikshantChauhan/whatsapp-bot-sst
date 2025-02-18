import { z } from "zod";
import flowDb, { FlowType } from "../../db/flow.db";
import DbService from "./db.service";
import { QueryCommand } from "dynamodb-toolbox";
import { generateDBId } from "../../utils";
import { campaignService } from "./campaign.service";
import { Campaign } from "../../db/campaign.db";
import { Flow } from "../walkFlow/typings";

type UE = typeof flowDb.entity;
type UT = typeof flowDb.table;

class FlowService extends DbService<UE, UT> {
  constructor() {
    super(flowDb.entity, flowDb.table);
  }

  public async updateAndValidate(id: string, payload: Omit<Flow, "id">) {
    const curr = await this.get({ id });
    if (!curr) throw new Error("Flow not found");

    const updated = await super.update({ ...payload, id }, { id });

    return updated!;
  }

  public async createAndValidate(
    payload: Omit<Flow, "id"> & {
      campaign_id?: string;
      order?: number;
    }
  ) {
    const schema = z.object({
      name: z.string(),
      type: z.enum(FlowType),
      data: z.object({
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
      }),
      campaign_id: z.string().optional(),
      order: z.number().positive().optional(),
    });

    const { campaign_id, order, ...flowPayload } = await schema.parseAsync(
      payload
    );

    let campaign: Campaign | undefined;

    // If the flow is a level, we need to get the campaign and validate it
    if (flowPayload.type === "level") {
      if (!campaign_id) {
        throw new Error("Campaign ID is required for level flows");
      }
      campaign = await campaignService.get({ id: campaign_id });
      if (!campaign) {
        throw new Error("Campaign not found");
      }
    }

    const flow = await this.insert({ ...flowPayload, id: generateDBId() });

    // If the flow is a level, we need to update the campaign levels, if error in updating, delete the flow
    if (campaign) {
      try {
        const updatedLevels = [...campaign.levels];
        updatedLevels.splice(
          order ? order + 1 : updatedLevels.length,
          0,
          flow.id
        );
        const updatedCampaign = await campaignService.updateAndValidate(
          campaign.id,
          {
            levels: updatedLevels,
          }
        );
        return { flow, campaign: updatedCampaign };
      } catch (error) {
        this.delete({ id: flow.id });
        throw error;
      }
    }

    return { flow, campaign };
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
