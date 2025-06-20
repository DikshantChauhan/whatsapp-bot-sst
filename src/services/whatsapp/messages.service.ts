import { WHATSAPP_API_TOKEN } from "../../constants";
import { getWhatsAppBaseURL } from "../../utils";
import ApiService from "../api.service";

interface BaseMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
}

interface TextMessage extends BaseMessage {
  type: "text";
  text: { body: string };
}

interface MediaMessage extends BaseMessage {
  type: "image" | "video" | "audio" | "document" | "sticker";
  [key: string]: any;
}

interface InteractiveButton {
  type: "reply";
  reply: { id: string; title: string };
}

interface MessageHeader {
  type: "text" | "image" | "video" | "document";
  text?: string;
  image?: { id: string } | { link: string };
  video?: { id: string } | { link: string };
  document?: { id: string } | { link: string };
}

interface ButtonMessage extends BaseMessage {
  type: "interactive";
  interactive: {
    type: "button";
    header?: { type: string } & MessageHeader;
    body: { text: string };
    footer?: { text: string };
    action: { buttons: InteractiveButton[] };
  };
}

interface ListMessage extends BaseMessage {
  type: "interactive";
  interactive: {
    type: "list";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: {
        title: string;
        rows: { id: string; title: string; description?: string }[];
      }[];
    };
  };
}

class WhatsappMessages extends ApiService {
  constructor() {
    super(getWhatsAppBaseURL(), WHATSAPP_API_TOKEN);
  }

  private createBaseMessage(to: string): BaseMessage {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
    };
  }

  async sendTextMessage(to: string, message: string) {
    return this.sendMessage<TextMessage>({
      ...this.createBaseMessage(to),
      type: "text",
      text: { body: message },
    });
  }

  async sendButtonMessage(
    to: string,
    message: string,
    options: string[],
    footer?: string,
    header?: MessageHeader
  ) {
    const buttons: InteractiveButton[] = options.map((option, index) => ({
      type: "reply" as const,
      reply: { id: `${index + 1}`, title: option },
    }));

    return this.sendMessage<ButtonMessage>({
      ...this.createBaseMessage(to),
      type: "interactive",
      interactive: {
        type: "button",
        header: header,
        body: { text: message },
        footer: footer ? { text: footer } : undefined,
        action: { buttons },
      },
    });
  }

  async sendListMessage(
    to: string,
    message: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[],
    options?: {
      button?: string;
      header?: string;
      footer?: string;
    }
  ) {
    return this.sendMessage<ListMessage>({
      ...this.createBaseMessage(to),
      type: "interactive",
      interactive: {
        type: "list",
        header: options?.header
          ? { type: "text", text: options.header }
          : undefined,
        body: { text: message },
        footer: options?.footer ? { text: options.footer } : undefined,
        action: {
          button: options?.button || "Select",
          sections,
        },
      },
    });
  }

  async sendMediaMessage(
    to: string,
    type: "image" | "video" | "audio" | "document" | "sticker",
    media: string,
    mediaType: "id" | "link",
    caption?: string
  ) {
    const payload = {
      ...this.createBaseMessage(to),
      type,
      [type]: { [mediaType]: media, caption },
    };
    return this.sendMessage<MediaMessage>(payload);
  }

  private async sendMessage<T>(data: T) {
    return await this.post(data);
  }
}

export const whatsappMessagesService = new WhatsappMessages();

export default WhatsappMessages;
