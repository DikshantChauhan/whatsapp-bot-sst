import { Request, Response } from "express";
import { flowService } from "../services/db/flow.service";
import { errorResponse, successResponse } from "../utils";
import { FlowType } from "../db/flow.db";
import { z } from "zod";

export default {
  async postFlow(request: Request, response: Response) {
    try {
      const { campaign_id, level_number, flow_data } = request.body as {
        campaign_id: string;
        level_number: number;
        flow_data: any;
      };

      const payload = await flowService
        .createPayloadSchema()
        .parseAsync(flow_data);
      await z
        .object({
          campaign_id: z.string().optional(),
          level_number: z.number().optional(),
        })
        .parseAsync({ campaign_id, level_number });

      if (payload.type === "level" && (!campaign_id || !level_number)) {
        return errorResponse(
          response,
          "campaign_id and level_number are required for level flow"
        );
      }

      const result = await flowService.create(
        payload,
        campaign_id,
        level_number
      );

      return successResponse(response, result);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async getFlow(request: Request, response: Response) {
    try {
      const { id } = request.params as {
        id: string;
      };
      const flow = await flowService.getOrFail(id);
      return successResponse(response, flow);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async updateFlow(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    try {
      const payload = await flowService
        .updatePayloadSchema()
        .parseAsync(request.body);
      const flow = await flowService.update(id, payload);
      return successResponse(response, flow);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async getAllByType(request: Request, response: Response) {
    try {
      const { type } = request.params as {
        type: (typeof FlowType)[number];
      };

      //validate type for flow type
      if (!FlowType.includes(type)) {
        return errorResponse(
          response,
          "Invalid type, valid types are: " + FlowType.join(", ")
        );
      }

      const result = await flowService.listByType(type);
      return successResponse(response, result);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async delete(request: Request, response: Response) {
    try {
      const { id } = request.params as {
        id: string;
      };

      await flowService.delete(id);
      return successResponse(response, { message: "Flow deleted" });
    } catch (error) {
      return errorResponse(response, error);
    }
  },
};
