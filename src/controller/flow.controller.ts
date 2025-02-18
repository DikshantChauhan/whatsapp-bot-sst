import { Request, Response } from "express";
import { flowService } from "../services/db/flow.service";
import { errorResponse, successResponse } from "../utils";

export default {
  async postFlow(request: Request, response: Response) {
    try {
      const result = await flowService.createAndValidate(request.body);
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
      const flow = await flowService.get({ id });
      return successResponse(response, flow);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async updateFlow(request: Request, response: Response) {
    const { id } = request.params as { id: string };
    try {
      const flow = await flowService.updateAndValidate(id, request.body);
      return successResponse(response, flow);
    } catch (error) {
      return errorResponse(response, error);
    }
  },

  async getAllByType(request: Request, response: Response) {
    try {
      const { type } = request.params as {
        type: string;
      };
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

      const flow = await flowService.delete({ id });
      return successResponse(response, flow);
    } catch (error) {
      return errorResponse(response, error);
    }
  },
};
