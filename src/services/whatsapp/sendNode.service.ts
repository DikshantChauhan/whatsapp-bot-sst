import WhatsappMessages from "./messages.service";
import { SendNodeHandler } from "../walkFlow/nodeHandler.service";
import { AppNode, AppNodeKey, DelayNode, Flow } from "../walkFlow/typings";
import { User } from "../../db/user.db";
import { userService } from "../db/user.service";
import WalkFlowService from "../walkFlow/walkFlow.service";
import { flowService } from "../db/flow.service";
import { getStartNode } from "../../utils";
import { nudgeService } from "../db/nudge.service";
import { FlowType } from "../../db/flow.db";

class SendNodesService extends WhatsappMessages {
  user: User;
  flow: Flow;

  constructor(user: User, flow: Flow) {
    super();
    this.user = user;
    this.flow = flow;
  }

  updateUser = async (payload: Partial<User>) => {
    this.user = await userService.update(this.user.phone_number, {
      ...this.user,
      ...payload,
    });
  };

  private getNudgeIdFromNode = ({ nudge }: AppNode) => {
    return nudge === "inherit" || !nudge
      ? this.user.nudge_id
      : nudge === "none"
      ? undefined
      : nudge;
  };

  handleLevelNodeNudge = async (nudgeId?: string) => {
    if (nudgeId) {
      const nudgeFlow = await flowService.getOrFail(nudgeId);
      const walkNudge = new WalkFlowService({
        flow: nudgeFlow,
        user: this.user,
      });
      const startNode = getStartNode(nudgeFlow);
      if (!startNode)
        throw new Error(`Start node not found for nudge flow: ${nudgeFlow.id}`);

      await walkNudge.walk(startNode.id);
      return;
    }

    await nudgeService.deleteByUserId(this.user.phone_number);
  };

  //keys updated node_id, nudge_id, level_id
  updateUserAfterLevelWalk = async (
    node: AppNode,
    extra: Partial<User> = {}
  ) => {
    const nudgeId = this.getNudgeIdFromNode(node);

    await this.updateUser({
      ...extra,
      node_id: node.id,
      nudge_id: nudgeId,
      level_id: this.flow.id,
    });

    await this.handleLevelNodeNudge(nudgeId);
  };

  protected logAfterNodeWalk = (
    type: (typeof FlowType)[number],
    node: AppNode
  ) => {
    console.log(`${type}: Send ${node.type} node`, node);
  };

  protected logAndUpdateUserAfterLevelWalk = async (node: AppNode) => {
    this.logAfterNodeWalk("level", node);
    await this.updateUserAfterLevelWalk(node);
  };

  protected sendLevelMessageNode: SendNodeHandler<AppNodeKey.MESSAGE_NODE_KEY> =
    async (node) => {
      const { text } = node.data;
      await this.sendTextMessage(this.user.phone_number, text);
      await this.updateUserAfterLevelWalk(node);
    };

  protected sendNudgeMessageNode: SendNodeHandler<AppNodeKey.MESSAGE_NODE_KEY> =
    async (node) => {
      const { text } = node.data;
      await this.sendTextMessage(this.user.phone_number, text);
    };

  private setLevelDelayNodeMetaOrFail = async (node: DelayNode) => {
    if (this.user.node_meta?.delay_wait_till_unix) {
      throw new Error(
        `Delay wait till already set for user: ${this.user.phone_number}`
      );
    }

    const { delayInSecs } = node.data;
    await this.updateUser({
      node_meta: {
        ...(this.user.node_meta || {}),
        delay_wait_till_unix: Date.now() + delayInSecs * 1000,
      },
    });
  };

  protected sendLevelDelayNode: SendNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async (node) => {
      const { message } = node.data;

      await this.setLevelDelayNodeMetaOrFail(node);

      message && (await this.sendTextMessage(this.user.phone_number, message));

      await this.updateUserAfterLevelWalk(node);
    };

  protected sendNudgeDelayNode: SendNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async (node) => {
      const { message, delayInSecs } = node.data;

      message && (await this.sendTextMessage(this.user.phone_number, message));

      await nudgeService.create({
        node_id: node.id,
        nudge_id: this.flow.id,
        reminder_time_unix: Date.now() + delayInSecs * 1000,
        user_id: this.user.phone_number,
      });
    };

  protected sendLevelPromptNode: SendNodeHandler<AppNodeKey.PROMPT_NODE_KEY> =
    async (node) => {
      await this.logAndUpdateUserAfterLevelWalk(node);
    };

  protected sendLevelButtonNode: SendNodeHandler<AppNodeKey.WHATSAPP_BUTTON_NODE_KEY> =
    async (node) => {
      const { text, buttons, footer } = node.data;
      await this.sendButtonMessage(
        this.user.phone_number,
        text,
        buttons,
        footer
      );
      await this.updateUserAfterLevelWalk(node);
    };

  protected sendLevelStartNode: SendNodeHandler<AppNodeKey.START_NODE_KEY> =
    async (node) => {
      await this.updateUserAfterLevelWalk(node);
    };

  protected sendNudgeStartNode: SendNodeHandler<AppNodeKey.START_NODE_KEY> =
    async (node) => {
      this.logAfterNodeWalk("nudge", node);
    };

  protected sendLevelEndNode: SendNodeHandler<AppNodeKey.END_NODE_KEY> = async (
    node
  ) => {
    const { text } = node.data;
    text && (await this.sendTextMessage(this.user.phone_number, text));
    await this.updateUserAfterLevelWalk(node);
  };

  protected sendNudgeEndNode: SendNodeHandler<AppNodeKey.END_NODE_KEY> = async (
    node
  ) => {
    const { text } = node.data;
    text && (await this.sendTextMessage(this.user.phone_number, text));
    await nudgeService.deleteByUserId(this.user.phone_number);
  };

  protected sendLevelVideoNode: SendNodeHandler<AppNodeKey.WHATSAPP_VIDEO_NODE_KEY> =
    async (node) => {
      const { media, mediaType, caption } = node.data;
      await this.sendMediaMessage(
        this.user.phone_number,
        "video",
        media,
        mediaType,
        caption
      );
      await this.updateUserAfterLevelWalk(node);
    };

  protected sendLevelListNode: SendNodeHandler<AppNodeKey.WHATSAPP_LIST_NODE_KEY> =
    async (node) => {
      const { text, buttons, footer, header, buttonLabel } = node.data;
      const sections = buttons.map((button, index) => ({
        title: `option-${index + 1}`,
        rows: [{ id: `${index + 1}`, title: button }],
      }));

      await this.sendListMessage(this.user.phone_number, text, sections, {
        footer,
        header,
        button: buttonLabel,
      });

      await this.updateUserAfterLevelWalk(node);
    };

  protected sendLevelWhatsappDocumentNode: SendNodeHandler<AppNodeKey.WHATSAPP_DOCUMENT_NODE_KEY> =
    async (node) => {
      const { id } = node.data;
      await this.sendMediaMessage(
        this.user.phone_number,
        "document",
        id,
        "id",
        ""
      );
      await this.updateUserAfterLevelWalk(node);
    };
}

export default SendNodesService;
