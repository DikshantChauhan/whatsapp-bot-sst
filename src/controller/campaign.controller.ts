import { Request, Response } from "express";
import { campaignService } from "../services/db/campaign.service";
import { errorResponse, successResponse } from "../utils";

export default {
  async create(request: Request, response: Response) {
    try {
      const campaign = await campaignService.createAndValidate(request.body);

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
      const campaign = await campaignService.getFull({ id });

      if (!campaign) return errorResponse(response, "Campaign not found");
      return successResponse(response, campaign);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async update(request: Request, response: Response) {
    try {
      const campaign = await campaignService.updateAndValidate(
        request.body.id,
        request.body
      );
      return successResponse(response, campaign);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async delete(request: Request, response: Response) {
    const { id } = request.params;

    if (!id) {
      response.status(400).json({ error: "Missing required fields" });
      return;
    }

    const success = await campaignService.delete({ id });

    if (!success) {
      response.status(404).json({ error: "Campaign not found" });
      return;
    }

    response.status(200).json({ message: "Campaign deleted" });
  },
};
