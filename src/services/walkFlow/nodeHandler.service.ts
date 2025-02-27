import { User } from "../../db/user.db";
import { AppNode, AppNodeKey, Edge, Flow } from "./typings";
import { campaignService } from "../db/campaign.service";
import { flowService } from "../db/flow.service";
import { Campaign } from "../../db/campaign.db";
import SendNodesService from "../whatsapp/sendNode.service";
import { getStartNode, parseNode } from "../../utils";
import { FlowType } from "../../db/flow.db";

export type SendNodeHandler<P extends AppNodeKey> = (
  node: Extract<AppNode, { type: P }>
) => Promise<void>;

export type GetNextNodeHandler<P extends AppNodeKey> = (data: {
  currentNode: Extract<AppNode, { type: P }>;
  input?: string;
  sourceEdges: Edge[];
}) => Promise<AppNode>;

type NodeHandlerMap = {
  [K in AppNodeKey]: {
    [T in (typeof FlowType)[number]]?: {
      getNextNode: GetNextNodeHandler<K>;
      sendNode: SendNodeHandler<K>;
      pauseAfterExecution: boolean;
    };
  };
};

class NodeHandlerService extends SendNodesService {
  campaign?: Campaign;

  constructor(payload: { flow: Flow; campaign?: Campaign; user: User }) {
    super(payload.user, payload.flow);

    this.campaign = payload.campaign;
  }

  getOrFetchCampaign = async (): Promise<Campaign> => {
    if (this.campaign) return this.campaign;
    this.campaign = await campaignService.getOrFail(this.user.campaign_id);
    return this.campaign;
  };

  public getNodeById = (id: string): AppNode | void => {
    const node = this.flow.data.nodes.find((node: AppNode) => node.id === id);

    if (node) {
      return parseNode(node, { user: this.user });
    }
  };

  public getNodeByIdOrFail = (id: string): AppNode => {
    const node = this.getNodeById(id);
    if (!node) throw new Error(`No node found for id: ${id}`);
    return node;
  };

  public getNodeSourceEdges = (nodeId: string): Edge[] => {
    const sourceEdges = this.flow.data.edges.filter(
      (edge) => edge.source === nodeId
    );
    return sourceEdges;
  };

  private ifElseNodeHandler: GetNextNodeHandler<AppNodeKey.IF_ELSE_NODE_KEY> =
    async ({ currentNode, input, sourceEdges }) => {
      if (!input) throw new Error("Input is required for if-else node");

      const { conditions } = currentNode.data;
      let matchingIndex = conditions.findIndex(
        (condition) => condition === input
      );

      //handle else case
      matchingIndex =
        matchingIndex === -1 ? conditions.length - 1 : matchingIndex;

      const edge = sourceEdges.find(
        ({ sourceHandle }) => sourceHandle === matchingIndex.toString()
      );

      if (!edge)
        throw new Error(
          `No edge found for if-else node id: ${currentNode.id} with input: ${input}`
        );

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private messageNodeHandler: GetNextNodeHandler<AppNodeKey.MESSAGE_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for message node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private startNodeHandler: GetNextNodeHandler<AppNodeKey.START_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for start node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private promptNodeHandler: GetNextNodeHandler<AppNodeKey.PROMPT_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for prompt node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private whatsappButtonNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_BUTTON_NODE_KEY> =
    async ({ currentNode, sourceEdges, input }) => {
      if (!input) throw new Error("Input is required for whatsapp button node");
      const { buttons } = currentNode.data;

      const matchingIndex = buttons.findIndex((option) => option === input);

      if (matchingIndex === -1) {
        //No matching option found
        return currentNode;
      }

      const edge = sourceEdges.find(
        (edge) => edge.sourceHandle?.toString() === matchingIndex.toString()
      );

      if (!edge)
        throw new Error(
          `No edge found for whatsapp button node id: ${currentNode.id} with edge: ${edge} and input: ${input}`
        );

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private levelEndNodeHandler: GetNextNodeHandler<AppNodeKey.END_NODE_KEY> =
    async ({ currentNode }) => {
      const campaign = await this.getOrFetchCampaign();

      const currentLevelIndex = campaign.levels.findIndex(
        (level) => level === this.user.level_id
      );
      const nextLevelId = campaign.levels[currentLevelIndex + 1];

      if (!nextLevelId) {
        return currentNode;
      }

      //update the flow for next level
      this.flow = await flowService.getOrFail(nextLevelId);
      const nextStartNode = getStartNode(this.flow);

      if (!nextStartNode)
        throw new Error(
          `No next node found after end node id: ${currentNode.id} with new flow-id: ${nextLevelId}`
        );

      return nextStartNode;
    };

  private nudgeEndNodeHandler: GetNextNodeHandler<AppNodeKey.END_NODE_KEY> =
    async ({ currentNode }) => currentNode;

  private whatsappVideoNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_VIDEO_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(
          `No edge found for whatsapp video node id: ${currentNode.id}`
        );

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private levelDelayNodeHandler: GetNextNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      if (this.isLevelDelayResolved()) {
        await this.updateUser({ node_meta: {} });
        const edge = sourceEdges[0];

        if (!edge)
          throw new Error(`No edge found for delay node id: ${currentNode.id}`);

        const nextNode = this.getNodeByIdOrFail(edge.target);

        return nextNode;
      }

      return currentNode;
    };

  private nudgeDelayNodeHandler: GetNextNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for delay node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private isLevelDelayResolved = (): boolean => {
    const waitTill = this.user.node_meta?.delay_wait_till_unix;
    if (!waitTill) {
      console.log(`No delayWaitTill found for user: ${this.user.phone_number}`);
      return true;
    } else if (waitTill > Date.now()) {
      return false;
    } else {
      return true;
    }
  };

  private whatsappListNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_LIST_NODE_KEY> =
    this.whatsappButtonNodeHandler as any;

  getNodesHandlerMap = () => {
    const map: NodeHandlerMap = {
      [AppNodeKey.IF_ELSE_NODE_KEY]: {
        level: {
          getNextNode: this.ifElseNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.logAndUpdateUserAfterLevelWalk,
        },
      },
      [AppNodeKey.MESSAGE_NODE_KEY]: {
        level: {
          getNextNode: this.messageNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelMessageNode,
        },
        nudge: {
          getNextNode: this.messageNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendNudgeMessageNode,
        },
      },
      [AppNodeKey.START_NODE_KEY]: {
        level: {
          getNextNode: this.startNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelStartNode,
        },
        nudge: {
          getNextNode: this.startNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendNudgeStartNode,
        },
      },
      [AppNodeKey.PROMPT_NODE_KEY]: {
        level: {
          getNextNode: this.promptNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendLevelPromptNode,
        },
      },
      [AppNodeKey.WHATSAPP_VIDEO_NODE_KEY]: {
        level: {
          getNextNode: this.whatsappVideoNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelVideoNode,
        },
      },
      [AppNodeKey.DELAY_NODE_KEY]: {
        level: {
          getNextNode: this.levelDelayNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendLevelDelayNode,
        },
        nudge: {
          getNextNode: this.nudgeDelayNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendNudgeDelayNode,
        },
      },
      [AppNodeKey.WHATSAPP_LIST_NODE_KEY]: {
        level: {
          getNextNode: this.whatsappListNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendLevelListNode,
        },
      },
      [AppNodeKey.WHATSAPP_BUTTON_NODE_KEY]: {
        level: {
          getNextNode: this.whatsappButtonNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendLevelButtonNode,
        },
      },
      [AppNodeKey.END_NODE_KEY]: {
        level: {
          getNextNode: this.levelEndNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelEndNode,
        },
        nudge: {
          getNextNode: this.nudgeEndNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendNudgeEndNode,
        },
      },
    };

    return map as Record<
      AppNodeKey,
      Record<
        (typeof FlowType)[number],
        | {
            getNextNode: GetNextNodeHandler<AppNodeKey>;
            sendNode: SendNodeHandler<AppNodeKey>;
            pauseAfterExecution: boolean;
          }
        | undefined
      >
    >;
  };
}

export default NodeHandlerService;
