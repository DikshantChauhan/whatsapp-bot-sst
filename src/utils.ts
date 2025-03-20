import {
  WHATSAPP_API_BASE_URL,
  PHONE_NUMBER_ID,
  ADMIN_PHONE_NUMBERS,
} from "./constants";
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { User } from "./db/user.db";
import { campaignService } from "./services/db/campaign.service";
import { flowService } from "./services/db/flow.service";
import { AppNode, AppNodeKey, Flow } from "./services/walkFlow/typings";

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

export const getStartNode = (flow: Flow): AppNode | undefined => {
  return flow.data.nodes.find(
    (node: AppNode) => node.type === AppNodeKey.START_NODE_KEY
  );
};

export const getDefaultUser = async (
  phone_number: string,
  name: string
): Promise<User> => {
  const campaign_Id = "48480b39-eb31-488b-8498-ff276136cef2";
  const campaign = await campaignService.getOrFail(campaign_Id);
  const startLevelId = campaign.levels[0];

  if (!startLevelId) throw new Error("Start level not found");

  const flow = await flowService.getOrFail(startLevelId);

  const startNode = getStartNode(flow);

  if (!startNode) throw new Error("Start node not found");

  return {
    phone_number,
    name,
    current_level_id: startLevelId,
    current_node_id: startNode.id,
    session_expires_at: Date.now() + 1000 * 60 * 60 * 24,
    current_campaign_id: campaign_Id,
    current_level_score: {},
    total_score: 0,
    max_level_id: startLevelId,
    id: generateDBId(),
  };
};

export const getDataFromWhatsappOwnboaringLink = (str: string) => {
  enum LinkKeyMap {
    "School name" = "whatsapp_ownboarding_school_name",
    "Dise code" = "whatsapp_ownboarding_dise_code",
    "District iD" = "whatsapp_ownboarding_district_id",
    "District name" = "whatsapp_ownboarding_district_name",
    "State name" = "whatsapp_ownboarding_state_name",
  }
  const metadata: Record<string, string> = {};
  const regex = /\*([^:]+):\s*([^*]+)\*/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    const key = match[1]?.trim() ?? "";
    const value = match[2]?.trim() ?? "";

    const userKey = LinkKeyMap[key as keyof typeof LinkKeyMap];
    if (userKey) metadata[userKey] = value;
  }

  return metadata as Record<LinkKeyMap, string | undefined>;
};

export interface SchoolAPIResponse {
  code: string;
  name: string;
  state: string;
  district: string;
  block: string;
  type: string;
  students: string;
  link: string;
}

export const fetchSchoolAPI = async (diseCode: string) => {
  const url = `https://codeyogi-colleges-prod.s3.amazonaws.com/colleges/${diseCode}.json`;
  const response = await fetch(url);
  const data = await response.json();
  return data as SchoolAPIResponse;
};

export const isAdmin = (user: User) => {
  return ADMIN_PHONE_NUMBERS.includes(user.phone_number);
};
