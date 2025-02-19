import { WHATSAPP_API_BASE_URL, PHONE_NUMBER_ID } from "./constants";
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { User } from "./db/user.db";
import { campaignService } from "./services/db/campaign.service";
import { flowService } from "./services/db/flow.service";
import NodeHandlerService from "./services/walkFlow/nodeHandler.service";
import { Flow } from "./services/walkFlow/typings";
export const getWhatsAppBaseURL = () => {
  return `${WHATSAPP_API_BASE_URL}/${PHONE_NUMBER_ID}/messages`;
};

const errorBody = (message: string) => {
  return {
    message,
  };
};

export const errorResponse = (
  res: Response,
  error: any,
  statusCode?: number
) => {
  console.log(error);
  const parsedError =
    error instanceof Error
      ? errorBody(error.message)
      : error?.message
      ? error
      : errorBody(error);
  res.status(statusCode || 400).json(parsedError);
};

export const successResponse = (
  res: Response,
  data: any,
  statusCode?: number
) => {
  res.status(statusCode || 200).json(data);
};

export const generateDBId = () => {
  return uuidv4();
};

export const getDefaultUser = async (
  phone_number: string,
  name: string
): Promise<User> => {
  const campaign_Id = "e1ea23a0-7fee-474f-8542-312b9d94b92a";
  const campaign = await campaignService.getOrFail(campaign_Id);
  const startLevelId = campaign.levels[0];

  if (!startLevelId) throw new Error("Start level not found");

  const flow = await flowService.getOrFail(startLevelId);

  const startNode = new NodeHandlerService(flow as Flow).getStartNode();

  if (!startNode) throw new Error("Start node not found");

  const nudge = startNode.nudge || "none";

  return {
    phone_number,
    name,
    level_id: startLevelId,
    node_id: startNode.id,
    nudge_id: nudge,
    session_expires_at: Date.now() + 1000 * 60 * 60 * 24,
    campaign_id: campaign_Id,
  };
};
