// Parse admin phone numbers from comma-separated string
const adminPhoneNumbers =
  process.env.ADMIN_PHONE_NUMBERS?.split(",").map((num) => num.trim()) || [];

// Export validated constants
export const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
export const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
export const ADMIN_PHONE_NUMBERS = adminPhoneNumbers;
export const DEFAULT_CAMPAIGN_ID = process.env.DEFAULT_CAMPAIGN_ID || "";

export const WHATSAPP_API_BASE_URL = "https://graph.facebook.com/v16.0";
