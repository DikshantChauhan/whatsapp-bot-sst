import { AppNodeKey, AppNode, Edge, Flow } from "./typings";
import SendNodesService from "../whatsapp/sendNode.service";
import FlowHandlerService from "./handler.service";
import { User } from "../../db/user.db";
import { userService } from "../db/user.service";
import s3Service from "../s3.service";
import { DEFAULT_FLOW_NAME } from "../../constants";

export type SendNodeHandler<P extends AppNodeKey> = (
  node: Extract<AppNode, { type: P }>
) => Promise<void>;

export type GetNextNodeHandler<P extends AppNodeKey> = (data: {
  node: Extract<AppNode, { type: P }>;
  input?: string;
  sourceEdges: Edge[];
  user: User;
}) => AppNode;

type NodeHandlerMap = {
  [K in AppNodeKey]: [GetNextNodeHandler<K>, SendNodeHandler<K>, boolean];
};

class FlowService {
  private flowHandlerService: FlowHandlerService;
  private sendNodesService: SendNodesService;
  private getNodeHandlerMap: NodeHandlerMap;
  private user: User;

  constructor(flow: Flow, user: User) {
    this.flowHandlerService = new FlowHandlerService(flow);
    this.sendNodesService = new SendNodesService(user.phoneNumber);
    this.user = user;
    this.getNodeHandlerMap = {
      [AppNodeKey.IF_ELSE_NODE_KEY]: [
        this.flowHandlerService.ifElseNodeHandler,
        this.sendNodesService.logNode(AppNodeKey.IF_ELSE_NODE_KEY),
        false,
      ],
      [AppNodeKey.MESSAGE_NODE_KEY]: [
        this.flowHandlerService.messageNodeHandler,
        this.sendNodesService.SendMessageNode,
        false,
      ],
      [AppNodeKey.START_NODE_KEY]: [
        this.flowHandlerService.startNodeHandler,
        this.sendNodesService.logNode(AppNodeKey.START_NODE_KEY),
        false,
      ],
      [AppNodeKey.PROMPT_NODE_KEY]: [
        this.flowHandlerService.promptNodeHandler,
        this.sendNodesService.SendPromptNode,
        true,
      ],
      [AppNodeKey.WHATSAPP_BUTTON_NODE_KEY]: [
        this.flowHandlerService.whatsappButtonNodeHandler,
        this.sendNodesService.SendButtonNode,
        true,
      ],
      [AppNodeKey.END_NODE_KEY]: [
        this.flowHandlerService.endNodeHandler,
        this.sendNodesService.SendEndNode,
        true,
      ],

      [AppNodeKey.WHATSAPP_VIDEO_NODE_KEY]: [
        this.flowHandlerService.whatsappVideoNodeHandler,
        this.sendNodesService.SendVideoNode,
        false,
      ],
      [AppNodeKey.DELAY_NODE_KEY]: [
        this.flowHandlerService.delayNodeHandler,
        async (node) => {
          await this.sendNodesService.SendDelayNode(node);
          await this.flowHandlerService.setDelayNodeMeta(user, node);
        },
        true,
      ],
      [AppNodeKey.WHATSAPP_LIST_NODE_KEY]: [
        this.flowHandlerService.whatsappListNodeHandler,
        this.sendNodesService.SendListNode,
        true,
      ],
    } satisfies NodeHandlerMap;
  }

  walkFlow = async (userInput?: string) => {
    const currentNode = this.flowHandlerService.getNodeById(
      this.user.currentNodeId
    );

    if (!currentNode)
      throw new Error(
        `Walk started, no current node found! currentNodeId: ${this.user.currentNodeId}`
      );

    const getNextNode = this.getNodeHandlerMap[
      currentNode.type
    ][0] as GetNextNodeHandler<AppNodeKey>;

    const nextNode = getNextNode({
      node: currentNode,
      input: userInput,
      sourceEdges: this.flowHandlerService.getNodeSourceEdges(currentNode.id),
      user: this.user,
    });

    const [_, sendNode, pause] = this.getNodeHandlerMap[nextNode.type] as [
      never,
      SendNodeHandler<AppNodeKey>,
      boolean
    ];

    //run next node validator
    await sendNode(nextNode);

    const updatedUser = await userService.update({
      ...this.user,
      currentNodeId: nextNode.id,
      currentNodeMeta: {},
      nudgeSubFlowId:
        nextNode.data.nudge === "inherit"
          ? this.user.nudgeSubFlowId
          : nextNode.data.nudge,
      nudgeNodeMeta: {},
    });
    this.user = updatedUser;

    if (!pause) {
      this.walkFlow(userInput);
    }
  };
}

const getFlowService = async (user: User) => {
  const flow = await s3Service.getFlow(user.flowId);
  if (!flow) throw new Error(`Flow ${user.flowId} not found`);
  return new FlowService(flow, user);
};
getFlowService.defaultFlowName = DEFAULT_FLOW_NAME;

export default getFlowService;
