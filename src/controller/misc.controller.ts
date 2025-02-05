import { Request, Response } from "express";
import { userService } from "../services/db/user.service";
// import s3Service from "../services/s3.service";

const test = async (_: Request, response: Response) => {
  const user = await userService.getAll();

  console.log(user);

  response.status(200).send(user);
  return;
};

const resetUserFlow = async (request: Request, response: Response) => {
  // const user = await userService.insert({
  //   phoneNumber: "+919826000000",
  //   name: "Test User",
  //   currentNodeId: "b0qzv",
  //   sessionExpiresAt: Date.now() + 10 * 1000,
  //   flowId: "123",
  //   currentNodeMeta: {
  //     delayWaitTill: Date.now() + 10 * 1000,
  //   },
  // });

  // response.status(200).send(user);
  const { phoneNumber } = request.body;

  if (!phoneNumber) {
    response.status(400).send("Phone number is required");
    return;
  }

  const user = await userService.get({ phoneNumber });

  if (!user) {
    response.status(404).send("User not found");
    return;
  }

  const update = await userService.update({
    ...user,
    currentNodeId: "b0qzv",
    currentNodeMeta: {
      ...(user.currentNodeMeta || {}),
      delayWaitTill: Date.now() + 30 * 1000,
    },
  });

  response.status(200).send(update);
  return;
};

const deleteUser = async (request: Request, response: Response) => {
  const { phoneNumber } = request.body;

  if (!phoneNumber) {
    response.status(400).send("Phone number is required");
    return;
  }

  await userService.delete({ phoneNumber });

  response.status(200).send("User deleted");
  return;
};

const nudgeHandler = async (request: Request, response: Response) => {
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

export default {
  test,
  resetUserFlow,
  deleteUser,
  nudgeHandler,
};
