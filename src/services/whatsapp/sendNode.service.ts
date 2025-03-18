import WhatsappMessages from "./messages.service";
import { SendNodeHandler } from "../walkFlow/nodeHandler.service";
import { AppNode, AppNodeKey, DelayNode, Flow } from "../walkFlow/typings";
import { User } from "../../db/user.db";
import { userService } from "../db/user.service";
import WalkFlowService from "../walkFlow/walkFlow.service";
import { flowService } from "../db/flow.service";
import { getDataFromWhatsappOwnboaringLink, getStartNode } from "../../utils";
import { nudgeService } from "../db/nudge.service";
import { FlowType } from "../../db/flow.db";
import { Campaign } from "../../db/campaign.db";

class SendNodesService extends WhatsappMessages {
  user: User;
  flow: Flow;
  campaign?: Campaign;

  constructor(user: User, flow: Flow, campaign?: Campaign) {
    super();
    this.user = user;
    this.flow = flow;
    this.campaign = campaign;
  }

  updateUser = async (payload: Partial<User>) => {
    const maxLevelId =
      payload.max_level_id ||
      (payload.current_level_id &&
        this.campaign &&
        this.campaign.levels.indexOf(payload.current_level_id) >
          this.campaign.levels.indexOf(this.user.max_level_id))
        ? payload.current_level_id
        : this.user.max_level_id;

    this.user = await userService.update(this.user.phone_number, {
      ...this.user,
      ...payload,
      max_level_id: maxLevelId,
    });
  };

  private getNudgeIdFromNode = ({ nudge }: AppNode) => {
    return nudge === "inherit" || !nudge
      ? this.user.current_nudge_id
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
      current_node_id: node.id,
      current_nudge_id: nudgeId,
      current_level_id: this.flow.id,
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

  protected sendLevelDelayNode: SendNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async (node) => {
      const { delayInSecs, message } = node.data;
      if (this.user.delay_wait_till_unix) {
        message &&
          (await this.sendTextMessage(this.user.phone_number, message));
        return;
      }
      await this.updateUserAfterLevelWalk(node, {
        delay_wait_till_unix: Date.now() + delayInSecs * 1000,
      });
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
      await this.updateUserAfterLevelWalk(node, {
        current_level_score: {},
      });
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

  protected sendLevelWhatsappUserUpdateNode: SendNodeHandler<AppNodeKey.WHATSAPP_USER_UPDATE_NODE_KEY> =
    async (node) => {
      const { name, level_id, node_id, age, whatsapp_ownboarding_dise_code } =
        node.data;
      await this.updateUser({
        ...(name ? { name } : {}),
        ...(level_id ? { level_id } : {}),
        ...(node_id ? { node_id } : {}),
        ...(age ? { age: Number(age) } : {}),
        ...(whatsapp_ownboarding_dise_code
          ? { whatsapp_ownboarding_dise_code }
          : {}),
      });
      await this.logAndUpdateUserAfterLevelWalk(node);
    };

  protected sendLevelWhatsappOwnboardingLinkParserNode: SendNodeHandler<AppNodeKey.WHATSAPP_OWNBOARDING_LINK_PARSER_NODE_KEY> =
    async (node) => {
      const meta = getDataFromWhatsappOwnboaringLink(node.data.link);
      await this.updateUser(meta);
    };

  protected sendLevelWhatsappConfirmSchoolNode: SendNodeHandler<AppNodeKey.WHATSAPP_CONFIRM_SCHOOL_NODE_KEY> =
    async (node) => {
      const { text, paths } = node.data;
      await this.sendButtonMessage(this.user.phone_number, text, paths);
      await this.updateUserAfterLevelWalk(node);
    };
}

export default SendNodesService;
