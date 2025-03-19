import { Request, Response } from "express";
import { errorResponse, getDefaultUser, successResponse } from "../utils";
import { userService } from "../services/db/user.service";
import { nudgeService } from "../services/db/nudge.service";
import nudgeCronHandler from "../handler/nudge.handler";

const nudgeHandler = async (_: Request, __: Response) => {
  await nudgeCronHandler();
  return successResponse(__, "Nudge cron handler executed");
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

const createNudgeSeedHandler = async (_: Request, response: Response) => {
  try {
    const nudges = await nudgeService.create({
      user_id: "1",
      reminder_time_unix: 1739988281582,
      node_id: "1",
      nudge_id: "1",
    });

    return successResponse(response, nudges);
  } catch (error) {
    return errorResponse(response, error);
  }
};

const scanAllNudgesHandler = async (_: Request, response: Response) => {
  try {
    const nudges = await nudgeService.scanAll();
    return successResponse(response, nudges);
  } catch (error) {
    return errorResponse(response, error);
  }
};

const deleteAllNudgesHandler = async (_: Request, response: Response) => {
  try {
    const nudges = await nudgeService.scanAll();
    await Promise.all(
      nudges.map((nudge) => nudgeService.deleteByUserId(nudge.user_id))
    );
    return successResponse(response, "All nudges deleted");
  } catch (error) {
    return errorResponse(response, error);
  }
};
const getPastNudgesHandler = async (request: Request, response: Response) => {
  try {
    const { greaterThanUnix } = request.body;
    if (!greaterThanUnix || typeof greaterThanUnix !== "number") {
      return errorResponse(response, "greaterThanUnix is required");
    }

    const nudges = await nudgeService.getPastNudges(greaterThanUnix, 100);
    return successResponse(response, nudges);
  } catch (error) {
    return errorResponse(response, error);
  }
};

export default {
  nudgeHandler,
  testHandler,
  createNudgeSeedHandler,
  scanAllNudgesHandler,
  getPastNudgesHandler,
  deleteAllNudgesHandler,
};
