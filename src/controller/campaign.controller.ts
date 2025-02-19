import { Request, Response } from "express";
import { campaignService } from "../services/db/campaign.service";
import { errorResponse, successResponse } from "../utils";

export default {
  async create(request: Request, response: Response) {
    try {
      const payload = await campaignService
        .createPayloadSchema()
        .parseAsync(request.body);

      const campaign = await campaignService.create(payload);

      return successResponse(response, campaign);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async getAll(_: Request, response: Response) {
    const campaigns = await campaignService.scanAll();

    return successResponse(response, campaigns);
  },

  async get(request: Request, response: Response) {
    try {
      const { id } = request.params as { id: string };
      const campaign = await campaignService.getOrFail(id);

      return successResponse(response, campaign);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async update(request: Request, response: Response) {
    try {
      const { id } = request.params as { id: string };
      const payload = await campaignService
        .updatePayloadSchema()
        .parseAsync(request.body);

      const campaign = await campaignService.update(id, payload);

      return successResponse(response, campaign);
    } catch (error) {
      return errorResponse(response, error);
    }
  },
};
