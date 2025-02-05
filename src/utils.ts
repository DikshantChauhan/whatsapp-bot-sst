import { WHATSAPP_API_BASE_URL, PHONE_NUMBER_ID } from "./constants";

export const getWhatsAppBaseURL = () => {
  return `${WHATSAPP_API_BASE_URL}/${PHONE_NUMBER_ID}/messages`;
};
