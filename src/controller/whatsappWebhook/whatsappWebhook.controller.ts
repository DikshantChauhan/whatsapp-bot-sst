import { Request, Response } from "express";
import { Message, WhatsAppWebhookPayload } from "./webhook.typings";
import { userService } from "../../services/db/user.service";
import WalkFlowService from "../../services/walkFlow/walkFlow.service";
import { whatsappMessagesService } from "../../services/whatsapp/messages.service";
import { User } from "../../db/user.db";
import { getDefaultUser } from "../../utils";
import { flowService } from "../../services/db/flow.service";

const getOrCreateUser = async (phone_number: string, name: string) => {
  let user = await userService.get(phone_number);

  if (!user) {
    const payload = await getDefaultUser(phone_number, name);
    user = await userService.create(payload);
  }
  return user;
};

const handleMessageReply = async (user: User, message: Message) => {
  const flow = await flowService.getOrFail(user.level_id);
  const walkFlowService = new WalkFlowService(flow, user);

  switch (message.type) {
    case "text":
      await walkFlowService.walk(message.text?.body);
      break;

    case "audio":
      const audioId = message.audio?.id;
      audioId &&
        (await whatsappMessagesService.sendMediaMessage(
          user.phone_number,
          "audio",
          audioId,
          "id",
          audioId
        ));
      break;

    case "image":
      const imageId = message.image?.id;
      imageId &&
        (await whatsappMessagesService.sendMediaMessage(
          user.phone_number,
          "image",
          imageId,
          "id",
          imageId
        ));
      break;

    case "video":
      const videoId = message.video?.id;
      videoId &&
        (await whatsappMessagesService.sendMediaMessage(
          user.phone_number,
          "video",
          videoId,
          "id",
          videoId
        ));
      break;

    case "document":
      const documentId = message.document?.id;
      documentId &&
        (await whatsappMessagesService.sendMediaMessage(
          user.phone_number,
          "document",
          documentId,
          "id",
          documentId
        ));
      break;

    case "sticker":
      console.log("Sticker message", message.sticker);
      break;

    case "interactive":
      const interactive = message.interactive;
      if (!interactive) {
        console.log("No interactive message");
        break;
      }
      switch (interactive.type) {
        case "button_reply":
          await walkFlowService.walk(interactive.button_reply?.title);
          break;
        case "list_reply":
          await walkFlowService.walk(interactive.list_reply?.title);
          break;
      }
      break;

    default:
      console.log("Unknown message type", message.type);
      break;
  }
};

const webhookHandler = async (payload: WhatsAppWebhookPayload) => {
  // console.log(JSON.stringify(payload, null, 2));
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { value } = change;
      const messages = value.messages || [];

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const contact = value.contacts?.[i];
        if (!contact || !message) continue;

        const user = await getOrCreateUser(contact.wa_id, contact.profile.name);
        await handleMessageReply(user, message);
      }
    }
  }
};

const webhook = (req: Request, res: Response) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === "hello-world") {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else if (req.method === "POST") {
    webhookHandler(req.body);
    res.status(200).send();
  }
};

export default {
  webhook,
};
