import { AppNodeKey, AppNode, Edge, Flow } from "./typings";
import SendNodeService from "../whatsapp/sendNode.service";
import NodeHandlerService from "./nodeHandler.service";

export type SendNodeHandler<P extends AppNodeKey> = (
  node: Extract<AppNode, { type: P }>
) => Promise<void>;

export type GetNextNodeHandler<P extends AppNodeKey> = (data: {
  node: Extract<AppNode, { type: P }>;
  input?: string;
  sourceEdges: Edge[];
}) => AppNode;

type NodeHandlerMap = {
  [K in AppNodeKey]: {
    getNextNode: GetNextNodeHandler<K>;
    sendNode: SendNodeHandler<K>;
    pauseAfterExecution: boolean;
  };
};

class WalkFlowService {
  nodeHandlerService: NodeHandlerService;
  sendNodesService: SendNodeService;
  nodeHandlerMap: NodeHandlerMap;

  constructor(flow: Flow, user_phone_number: string) {
    this.nodeHandlerService = new NodeHandlerService(flow);
    this.sendNodesService = new SendNodeService(user_phone_number);
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
        pauseAfterExecution: false,
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
          // await this.nodeHandlerService.setDelayNodeMeta(this.user, node);
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

  walk = async (currentNodeId: string, userInput?: string) => {
    const currentNode = this.nodeHandlerService.getNodeById(currentNodeId);

    if (!currentNode)
      throw new Error(
        `Walk started, no current node found! currentNodeId: ${currentNodeId}`
      );

    const { getNextNode } = this.nodeHandlerMap[currentNode.type] as {
      getNextNode: GetNextNodeHandler<AppNodeKey>;
    };

    const nextNode = getNextNode({
      node: currentNode,
      input: userInput,
      sourceEdges: this.nodeHandlerService.getNodeSourceEdges(currentNode.id),
    });

    const { sendNode, pauseAfterExecution } = this.nodeHandlerMap[
      nextNode.type
    ] as {
      sendNode: SendNodeHandler<AppNodeKey>;
      pauseAfterExecution: boolean;
    };

    return {
      nextNode,
      sendNextNode: sendNode,
      currentNode,
      pauseAfterSendNextNode: pauseAfterExecution,
    };
  };
}

export default WalkFlowService;
