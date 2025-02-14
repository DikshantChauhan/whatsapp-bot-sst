import { userService } from "../services/db/user.service";
import { Request, Response } from "express";
import { successResponse } from "../utils";

export default {
  async all(_: Request, response: Response) {
    const users = await userService.scanAll();

    response.status(200).send(users);
  },

  async get(request: Request, response: Response) {
    const { phone_number } = request.params;

    if (!phone_number) {
      response.status(400).send("Phone number is required");
      return;
    }

    const user = await userService.get({ phone_number });

    if (!user) {
      response.status(404).send("User not found");
      return;
    }

    response.status(200).send(user);
  },

  async create(request: Request, response: Response) {
    const user = await userService.createAndValidate(request.body);

    return successResponse(response, user);
  },

  async update(request: Request, response: Response) {
    const { phone_number } = request.params;
    const { name, level_id, node_id, campaign_id, nudge_id } = request.body;

    if (!phone_number) {
      response.status(400).send("Phone number is required");
      return;
    }

    const user = await userService.update({
      phone_number,
      name,
      level_id,
      node_id,
      campaign_id,
      nudge_id,
    });

    response.status(200).send(user);
  },

  async delete(request: Request, response: Response) {
    const { phone_number } = request.params;

    if (!phone_number) {
      response.status(400).send("Phone number is required");
      return;
    }

    const success = await userService.delete({ phone_number });

    if (!success) {
      response.status(500).send("Error deleting user");
      return;
    }

    response.status(200).send("User deleted");
  },
};
