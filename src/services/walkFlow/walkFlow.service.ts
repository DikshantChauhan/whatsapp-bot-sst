import { AppNodeKey, AppNode, Edge, Flow } from "./typings";
import SendNodeService from "../whatsapp/sendNode.service";
import NodeHandlerService from "./nodeHandler.service";
import { User } from "../../db/user.db";
import { userService } from "../db/user.service";

export type SendNodeHandler<P extends AppNodeKey> = (
  node: Extract<AppNode, { type: P }>
) => Promise<void>;

export type GetNextNodeHandler<P extends AppNodeKey> = (data: {
  node: Extract<AppNode, { type: P }>;
  input?: string;
  sourceEdges: Edge[];
  user: User;
}) => Promise<AppNode> | AppNode;

type NodeHandlerMap = {
  [K in AppNodeKey]: {
    getNextNode: GetNextNodeHandler<K>;
    sendNode: SendNodeHandler<K>;
    pauseAfterExecution: boolean;
  };
};

class WalkFlowService {
  private nodeHandlerService: NodeHandlerService;
  private sendNodesService: SendNodeService;
  private nodeHandlerMap: NodeHandlerMap;
  private user: User;

  constructor(flow: Flow, user: User) {
    this.nodeHandlerService = new NodeHandlerService(flow);
    this.sendNodesService = new SendNodeService(user.phone_number);
    this.user = user;
    this.nodeHandlerMap = this.createNodeHandlerMap();
  }

  private createNodeHandlerMap(): NodeHandlerMap {
    return {
      [AppNodeKey.IF_ELSE_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.ifElseNodeHandler,
        sendNode: this.sendNodesService.logNode(AppNodeKey.IF_ELSE_NODE_KEY),
        pauseAfterExecution: false,
      },
      [AppNodeKey.MESSAGE_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.messageNodeHandler,
        sendNode: this.sendNodesService.SendMessageNode,
        pauseAfterExecution: false,
      },
      [AppNodeKey.START_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.startNodeHandler,
        sendNode: this.sendNodesService.logNode(AppNodeKey.START_NODE_KEY),
        pauseAfterExecution: false,
      },
      [AppNodeKey.PROMPT_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.promptNodeHandler,
        sendNode: this.sendNodesService.SendPromptNode,
        pauseAfterExecution: true,
      },
      [AppNodeKey.WHATSAPP_BUTTON_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.whatsappButtonNodeHandler,
        sendNode: this.sendNodesService.SendButtonNode,
        pauseAfterExecution: true,
      },
      [AppNodeKey.END_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.endNodeHandler,
        sendNode: this.sendNodesService.SendEndNode,
        pauseAfterExecution: true,
      },
      [AppNodeKey.WHATSAPP_VIDEO_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.whatsappVideoNodeHandler,
        sendNode: this.sendNodesService.SendVideoNode,
        pauseAfterExecution: false,
      },
      [AppNodeKey.DELAY_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.delayNodeHandler,
        sendNode: async (node) => {
          await this.sendNodesService.SendDelayNode(node);
          await this.nodeHandlerService.setDelayNodeMeta(this.user, node);
        },
        pauseAfterExecution: true,
      },
      [AppNodeKey.WHATSAPP_LIST_NODE_KEY]: {
        getNextNode: this.nodeHandlerService.whatsappListNodeHandler,
        sendNode: this.sendNodesService.SendListNode,
        pauseAfterExecution: true,
      },
    };
  }

  walk = async (userInput?: string) => {
    const currentNode = this.nodeHandlerService.getNodeById(this.user.node_id);
    console.log("currentNode", currentNode);

    if (!currentNode)
      throw new Error(
        `Walk started, no current node found! currentNodeId: ${this.user.node_id}`
      );

    const { getNextNode } = this.nodeHandlerMap[currentNode.type] as {
      getNextNode: GetNextNodeHandler<AppNodeKey>;
    };

    const nextNode = await getNextNode({
      node: currentNode,
      input: userInput,
      sourceEdges: this.nodeHandlerService.getNodeSourceEdges(currentNode.id),
      user: this.user,
    });

    const { sendNode, pauseAfterExecution } = this.nodeHandlerMap[
      nextNode.type
    ] as {
      sendNode: SendNodeHandler<AppNodeKey>;
      pauseAfterExecution: boolean;
    };

    //run next node validator
    await sendNode(nextNode);

    this.user = await userService.update(this.user.phone_number, {
      ...this.user,
      node_id: nextNode.id,
      node_meta: {},
      nudge_id:
        nextNode.nudge === "inherit"
          ? this.user.nudge_id
          : nextNode.nudge === "none"
          ? undefined
          : nextNode.nudge,
    });

    if (!pauseAfterExecution) {
      this.walk(userInput);
    }
  };
}

export default WalkFlowService;
