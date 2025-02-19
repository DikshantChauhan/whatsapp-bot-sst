import { userService } from "../services/db/user.service";
import { Request, Response } from "express";

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

    const user = await userService.get(phone_number);

    if (!user) {
      response.status(404).send("User not found");
      return;
    }

    response.status(200).send(user);
  },
};
