import { WHATSAPP_API_BASE_URL, PHONE_NUMBER_ID } from "./constants";
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
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
