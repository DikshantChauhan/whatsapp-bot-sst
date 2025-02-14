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

  async updateFlow(_: Request, __: Response) {
    // const { id } = request.params;
    // const { type } = request.body as { type: FlowType };
    // if (!id) {
    //   response.status(400).json({ error: "Missing required fields" });
    //   return;
    // }
    // if (type !== "level" && type !== "nudge") {
    //   response.status(400).json({ error: "Missing required fields" });
    //   return;
    // }
    // const flow = await flowService.update({
    //   id,
    //   type,
    //   data: request.body.flow,
    //   name: request.body.name,
    // });
    // if (!flow) {
    //   response.status(400).json({ error: "flow not found" });
    //   return;
    // }
    // response.send(flow);
    // return;
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
