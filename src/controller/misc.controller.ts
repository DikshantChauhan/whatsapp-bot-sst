import { Request, Response } from "express";
import { errorResponse, getDefaultUser, successResponse } from "../utils";
import { userService } from "../services/db/user.service";

const nudgeHandler = async (_: Request, __: Response) => {
  // const { phoneNumber } = request.body;
  // if (!phoneNumber) {
  //   response.status(400).send("Phone number is required");
  //   return;
  // }
  // const user = await userService.get({ phoneNumber });
  // if (!user) {
  //   response.status(404).send("User not found");
  //   return;
  // }
  // if (!user.nudgeSubFlowId || user.nudgeSubFlowId === "none") {
  //   response.status(400).send("User has no nudge sub flow id");
  //   return;
  // }
  // const nudgeSubFlow = await s3Service.getFlow(user.nudgeSubFlowId);
  // if (!nudgeSubFlow) {
  //   response.status(404).send("Nudge sub flow not found");
  //   return;
  // }
  // await userService.update({
  //   ...user,
  //   currentNodeId: "b0qzv",
  //   currentNodeMeta: {
  //     ...(user.currentNodeMeta || {}),
  //     delayWaitTill: Date.now() + 30 * 1000,
  //   },
  // });
  // response.status(200).send(update);
  // return;
};

const testHandler = async (request: Request, response: Response) => {
  try {
    const { phoneNumber, name } = request.body;
    const payload = await getDefaultUser(phoneNumber, name);
    const user = await userService.update(phoneNumber, payload);
    return successResponse(response, user);
  } catch (error) {
    return errorResponse(response, error);
  }
};

export default {
  nudgeHandler,
  testHandler,
};
