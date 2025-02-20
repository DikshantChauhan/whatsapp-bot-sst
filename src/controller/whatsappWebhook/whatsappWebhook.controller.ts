import { Request, Response } from "express";
import { Message, WhatsAppWebhookPayload } from "./webhook.typings";
import { userService } from "../../services/db/user.service";
import WalkFlowService from "../../services/walkFlow/walkFlow.service";
import { whatsappMessagesService } from "../../services/whatsapp/messages.service";
import { User } from "../../db/user.db";
import { getDefaultUser } from "../../utils";
import { flowService } from "../../services/db/flow.service";
import { AppNodeKey, Flow } from "../../services/walkFlow/typings";
import NodeHandlerService from "../../services/walkFlow/nodeHandler.service";
import { campaignService } from "../../services/db/campaign.service";
import { nudgeService } from "../../services/db/nudge.service";

const getOrCreateUser = async (phone_number: string, name: string) => {
  let user = await userService.get(phone_number);

  if (!user) {
    const payload = await getDefaultUser(phone_number, name);
    user = await userService.create(payload);
  }
  return user;
};

const walkNudge = async (user: User, nudge: Flow, nodeId?: string) => {
  let walkFlowService = new WalkFlowService(nudge, user.phone_number);
  let currentNodeId =
    nodeId || walkFlowService.nodeHandlerService.getStartNode()?.id;

  if (!currentNodeId) {
    throw new Error(
      `No current node found for nudge of user: ${user.phone_number}`
    );
  }

  while (true) {
    let { nextNode, sendNextNode } = await walkFlowService.walk(currentNodeId);

    if (nextNode.type === AppNodeKey.DELAY_NODE_KEY) {
      const { data } = nextNode;
      await nudgeService.create({
        node_id: nextNode.id,
        user_id: user.phone_number,
        reminder_time_unix: Date.now() + data.delayInSecs * 1000,
        nudge_id: nudge.id,
      });
      await sendNextNode(nextNode);
      break;
    } else if (nextNode.type === AppNodeKey.END_NODE_KEY) {
      await nudgeService.deleteByUserId(user.phone_number);
      break;
    }

    await sendNextNode(nextNode);

    currentNodeId = nextNode.id;
  }
};

const walkCampaign = async (user: User, flow: Flow, input?: string) => {
  let walkFlowService = new WalkFlowService(flow, user.phone_number);
  let updatedUser = user;

  while (true) {
    let { currentNode, nextNode, sendNextNode, pauseAfterSendNextNode } =
      await walkFlowService.walk(user.node_id, input);

    if (
      currentNode.type === AppNodeKey.DELAY_NODE_KEY &&
      !NodeHandlerService.isCurrentDelayNodeResolved(updatedUser)
    ) {
      await sendNextNode(nextNode);
      break;
    } else if (currentNode.type === AppNodeKey.END_NODE_KEY) {
      const campaign = await campaignService.getOrFail(user.campaign_id);
      const currentLevelIndex = campaign.levels.findIndex(
        (level) => level === user.level_id
      );
      const nextLevelId = campaign.levels[currentLevelIndex + 1];

      if (nextLevelId) {
        const newFlow = await flowService.getOrFail(nextLevelId);
        walkFlowService = new WalkFlowService(newFlow, user.phone_number);
        const updatedNextNode =
          walkFlowService.nodeHandlerService.getStartNode();
        if (!updatedNextNode)
          throw new Error(
            `No next node found after end node id: ${currentNode.id} with new flow-id: ${nextLevelId}`
          );
        nextNode = updatedNextNode;
        pauseAfterSendNextNode = false;
      } else {
        pauseAfterSendNextNode = true;
      }
    }

    if (nextNode.type === AppNodeKey.DELAY_NODE_KEY) {
      NodeHandlerService.setDelayNodeMeta(updatedUser, nextNode);
    }

    //run next node validator

    await sendNextNode(nextNode);

    const nudgeId =
      nextNode.nudge === "inherit"
        ? updatedUser.nudge_id
        : nextNode.nudge === "none"
        ? undefined
        : nextNode.nudge || updatedUser.nudge_id;

    updatedUser = await userService.update(updatedUser.phone_number, {
      ...updatedUser,
      node_id: nextNode.id,
      node_meta: {},
      nudge_id: nudgeId,
      level_id: walkFlowService.nodeHandlerService.flow.id,
    });

    if (nudgeId) {
      const nudgeFlow = await flowService.getOrFail(nudgeId);
      await walkNudge(updatedUser, nudgeFlow);
    } else {
      await nudgeService.deleteByUserId(updatedUser.phone_number);
    }

    if (pauseAfterSendNextNode) {
      break;
    }
  }
};

const handleMessageReply = async (user: User, message: Message) => {
  const flow = await flowService.getOrFail(user.level_id);

  switch (message.type) {
    case "text":
      await walkCampaign(user, flow, message.text?.body);
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
          await walkCampaign(user, flow, interactive.button_reply?.title);
          break;
        case "list_reply":
          await walkCampaign(user, flow, interactive.list_reply?.title);
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
