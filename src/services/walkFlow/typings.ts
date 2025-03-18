export type SubFlowsMapValue = "inherit" | "none" | (string & {});
export type SubFlowsMap = Record<
  string,
  { nudge: SubFlowsMapValue; validator: SubFlowsMapValue }
>;

export interface FlowData {
  nodes: AppNode[];
  edges: Edge[];
}

export interface Flow {
  id: string;
  name: string;
  type: "level" | "nudge";
  data: FlowData;
}

export interface Edge {
  source: string;
  target: string;
  id: string;
  sourceHandle?: string;
  selected?: boolean;
}

export enum AppNodeKey {
  IF_ELSE_NODE_KEY = "if-else",
  MESSAGE_NODE_KEY = "message",
  START_NODE_KEY = "start",
  PROMPT_NODE_KEY = "prompt",
  WHATSAPP_BUTTON_NODE_KEY = "whatsapp-button",
  END_NODE_KEY = "end",
  WHATSAPP_VIDEO_NODE_KEY = "whatsapp-video",
  DELAY_NODE_KEY = "delay",
  WHATSAPP_LIST_NODE_KEY = "whatsapp-list",
  WHATSAPP_DOCUMENT_NODE_KEY = "whatsapp-document",
  WHATSAPP_USER_UPDATE_NODE_KEY = "whatsapp-user-update",
  WHATSAPP_OWNBOARDING_LINK_PARSER_NODE_KEY = "whatsapp-ownboarding-link-parser",
  WHATSAPP_VALIDATE_DISE_CODE_NODE_KEY = "whatsapp-validate-dise-code",
  WHATSAPP_CONFIRM_SCHOOL_NODE_KEY = "whatsapp-confirm-school",
}

export type SubFlowValue = "inherit" | "none" | (string & {});
export interface BaseNode<T extends AppNodeKey, D extends Record<string, any>> {
  id: string;
  type: T;
  data: D;
  nudge?: SubFlowValue;
  validator?: SubFlowValue;
}

export type IfElseNode = BaseNode<
  AppNodeKey.IF_ELSE_NODE_KEY,
  {
    conditions: {
      variable: string;
      condition: "==" | "!=" | ">" | "<" | ">=" | "<=";
      type: "string" | "number" | "boolean" | "variable" | "null";
      value: string;
    }[];
  }
>;

export type MessageNode = BaseNode<
  AppNodeKey.MESSAGE_NODE_KEY,
  { text: string }
>;

export type StartNode = BaseNode<AppNodeKey.START_NODE_KEY, {}>;

export type PromptNode = BaseNode<
  AppNodeKey.PROMPT_NODE_KEY,
  {
    type: "text" | "number";
    min?: number;
    max?: number;
  }
>;

interface MessageHeader {
  type: "text" | "image" | "video" | "document";
  text?: string;
  image?: { id: string } | { link: string };
  video?: { id: string } | { link: string };
  document?: { id: string } | { link: string };
}

export type WhatsappButtonNode = BaseNode<
  AppNodeKey.WHATSAPP_BUTTON_NODE_KEY,
  {
    text: string;
    buttons: string[];
    footer?: string;
    header?: MessageHeader;
  }
>;

export type EndNode = BaseNode<
  AppNodeKey.END_NODE_KEY,
  {
    text?: string;
  }
>;

export type WhatsappVideoNode = BaseNode<
  AppNodeKey.WHATSAPP_VIDEO_NODE_KEY,
  { media: string; mediaType: "id" | "link"; caption?: string }
>;

export type DelayNode = BaseNode<
  AppNodeKey.DELAY_NODE_KEY,
  {
    message?: string;
    delayInSecs: number;
  }
>;

export type WhatsappListNode = BaseNode<
  AppNodeKey.WHATSAPP_LIST_NODE_KEY,
  {
    text: string;
    buttons: string[];
    footer?: string;
    header?: string;
    buttonLabel?: string;
    correctIndex: number;
  }
>;

export type WhatsappDocumentNode = BaseNode<
  AppNodeKey.WHATSAPP_DOCUMENT_NODE_KEY,
  { id: string }
>;

export type WhatsappUserUpdateNode = BaseNode<
  AppNodeKey.WHATSAPP_USER_UPDATE_NODE_KEY,
  {
    name?: string;
    level_id?: string;
    node_id?: string;
    age?: string;
    whatsapp_ownboarding_dise_code?: string;
  }
>;

export type WhatsappOwnboardingLinkParserNode = BaseNode<
  AppNodeKey.WHATSAPP_OWNBOARDING_LINK_PARSER_NODE_KEY,
  {
    link: string;
    paths: ["teacher", "student", "unknown"];
  }
>;

export type WhatsappValidateDiseCodeNode = BaseNode<
  AppNodeKey.WHATSAPP_VALIDATE_DISE_CODE_NODE_KEY,
  {
    paths: ["valid", "invalid"];
  }
>;

export type WhatsappConfirmSchoolNode = BaseNode<
  AppNodeKey.WHATSAPP_CONFIRM_SCHOOL_NODE_KEY,
  {
    text: string;
    paths: ["No", "Confirm"];
  }
>;

export type AppNode =
  | IfElseNode
  | MessageNode
  | StartNode
  | PromptNode
  | EndNode
  | WhatsappButtonNode
  | WhatsappVideoNode
  | DelayNode
  | WhatsappListNode
  | WhatsappDocumentNode
  | WhatsappUserUpdateNode
  | WhatsappOwnboardingLinkParserNode
  | WhatsappValidateDiseCodeNode
  | WhatsappConfirmSchoolNode;
