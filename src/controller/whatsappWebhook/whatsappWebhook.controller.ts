import { Request, Response } from "express";
import { Message, WhatsAppWebhookPayload } from "./webhook.typings";
import { userService } from "../../services/db/user.service";
import getFlowService from "../../services/flow/flow.service";
import s3Service from "../../services/s3.service";
import { AppNodeKey } from "../../services/flow/typings";
import { whatsappMessagesService } from "../../services/whatsapp/messages.service";
import { User } from "../../db/user.db";

const getOrCreateUser = async (phoneNumber: string, name: string) => {
  let user = await userService.get({ phoneNumber });

  if (!user) {
    const flow = await s3Service.getFlow(getFlowService.defaultFlowName);
    if (!flow)
      throw new Error(`Flow ${getFlowService.defaultFlowName} not found`);
    const startNode = flow.data.nodes.find(
      (node) => node.type === AppNodeKey.START_NODE_KEY
    );
    if (!startNode)
      throw new Error(
        `Start node not found in flow ${getFlowService.defaultFlowName}`
      );

    user = await userService.create({
      phoneNumber,
      name,
      currentNodeId: startNode.id,
      sessionExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      flowId: flow.name,
    });
  }
  return user;
};

const handleMessageReply = async (
  user: User,
  message: Message,
  flowService: Awaited<ReturnType<typeof getFlowService>>
) => {
  switch (message.type) {
    case "text":
      await flowService.walkFlow(message.text?.body);
      break;

    case "audio":
      console.log("Audio message", message.audio);
      break;

    case "image":
      console.log("Image message", message.image);
      break;

    case "video":
      const videoId = message.video?.id;
      await whatsappMessagesService.sendTextMessage(
        user.phoneNumber,
        `Video-id: ${videoId}`
      );
      break;

    case "document":
      console.log("Document message", message.document);
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
          await flowService.walkFlow(interactive.button_reply?.title);
          break;
        case "list_reply":
          await flowService.walkFlow(interactive.list_reply?.title);
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

        const flowService = await getFlowService(user);
        await handleMessageReply(user, message, flowService);
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
