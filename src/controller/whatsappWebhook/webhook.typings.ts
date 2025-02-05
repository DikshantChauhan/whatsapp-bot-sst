export interface WhatsAppWebhookPayload {
  object: string;
  entry: Entry[];
}

export interface Entry {
  id: string;
  changes: Change[];
}

export interface Change {
  field: string;
  value: Value;
}

export interface Value {
  messaging_product: "whatsapp";
  metadata: Metadata;
  contacts?: Contact[];
  messages?: Message[];
  statuses?: Status[];
}

export interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface Contact {
  profile: { name: string };
  wa_id: string;
}

export interface Message {
  from: string;
  id: string;
  timestamp: string;
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "sticker"
    | "interactive";
  text?: { body: string };
  image?: Media;
  video?: Media;
  audio?: Media;
  document?: Media;
  sticker?: Media;
  interactive?: Interactive;
}

export interface Media {
  id: string;
  mime_type: string;
  sha256: string;
  file_size: number;
}

export interface Interactive {
  type: "button_reply" | "list_reply";
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description: string };
}

export interface Status {
  id: string;
  status: "delivered" | "read" | "failed" | "sent";
  timestamp: string;
}
