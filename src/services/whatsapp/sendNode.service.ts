import WhatsappMessages from "./messages.service";
import { SendNodeHandler } from "../walkFlow/walkFlow";
import { AppNode, AppNodeKey } from "../walkFlow/typings";

class SendNodesService extends WhatsappMessages {
  private toPhoneNumber: string;

  constructor(toPhoneNumber: string) {
    super();
    this.toPhoneNumber = toPhoneNumber;
  }

  public logNode = (type: AppNodeKey) => async (node: AppNode) => {
    console.log(`Send ${type} node`, node);
  };

  public SendMessageNode: SendNodeHandler<AppNodeKey.MESSAGE_NODE_KEY> = async (
    node
  ) => {
    const { text } = node.data;
    await this.sendTextMessage(this.toPhoneNumber, text);
  };

  public SendDelayNode: SendNodeHandler<AppNodeKey.DELAY_NODE_KEY> = async (
    node
  ) => {
    const { message } = node.data;
    message
      ? await this.sendTextMessage(this.toPhoneNumber, message)
      : this.logNode(AppNodeKey.DELAY_NODE_KEY)(node);
  };

  public SendPromptNode: SendNodeHandler<AppNodeKey.PROMPT_NODE_KEY> = async (
    node
  ) => {
    this.logNode(AppNodeKey.PROMPT_NODE_KEY)(node);
    return;
  };

  public SendButtonNode: SendNodeHandler<AppNodeKey.WHATSAPP_BUTTON_NODE_KEY> =
    async (node) => {
      const { text, buttons, footer } = node.data;
      await this.sendButtonMessage(this.toPhoneNumber, text, buttons, footer);
    };

  public SendEndNode: SendNodeHandler<AppNodeKey.END_NODE_KEY> = async (
    node
  ) => {
    const { text } = node.data;
    if (!text) {
      this.logNode(AppNodeKey.END_NODE_KEY)(node);
      return;
    }
    await this.sendTextMessage(this.toPhoneNumber, text);
  };

  public SendVideoNode: SendNodeHandler<AppNodeKey.WHATSAPP_VIDEO_NODE_KEY> =
    async (node) => {
      const { media, mediaType, caption } = node.data;
      await this.sendMediaMessage(
        this.toPhoneNumber,
        "video",
        media,
        mediaType,
        caption
      );
    };

  public SendListNode: SendNodeHandler<AppNodeKey.WHATSAPP_LIST_NODE_KEY> =
    async (node) => {
      const { text, buttons, footer, header, buttonLabel } = node.data;
      const sections = buttons.map((button, index) => ({
        title: `option-${index + 1}`,
        rows: [{ id: `${index + 1}`, title: button }],
      }));

      await this.sendListMessage(this.toPhoneNumber, text, sections, {
        footer,
        header,
        button: buttonLabel,
      });
    };
}

export default SendNodesService;
