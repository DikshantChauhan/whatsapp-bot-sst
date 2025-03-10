import { User } from "../../db/user.db";
import { AppNode, AppNodeKey, Edge, Flow } from "./typings";
import { campaignService } from "../db/campaign.service";
import { flowService } from "../db/flow.service";
import { Campaign } from "../../db/campaign.db";
import SendNodesService from "../whatsapp/sendNode.service";
import { getStartNode } from "../../utils";
import { FlowType } from "../../db/flow.db";
import variableParserService from "./variableParser.service";

export type SendNodeHandler<P extends AppNodeKey> = (
  node: Extract<AppNode, { type: P }>
) => Promise<void>;

export type GetNextNodeHandler<P extends AppNodeKey> = (data: {
  currentNode: Extract<AppNode, { type: P }>;
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
  chatInput?: string;

  constructor(payload: {
    flow: Flow;
    campaign?: Campaign;
    user: User;
    chatInput?: string;
  }) {
    super(payload.user, payload.flow, payload.campaign);

    this.chatInput = payload.chatInput;
  }

  getOrFetchCampaign = async (): Promise<Campaign> => {
    if (this.campaign) return this.campaign;
    this.campaign = await campaignService.getOrFail(this.user.campaign_id);
    return this.campaign;
  };

  public getNodeById = (id: string): AppNode | void => {
    const node = this.flow.data.nodes.find((node: AppNode) => node.id === id);

    if (node) {
      return variableParserService.parseNode(node, {
        user: this.user,
        chat: { input: this.chatInput },
      });
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
    async ({ currentNode, sourceEdges }) => {
      if (!this.chatInput)
        throw new Error("Input is required for if-else node");

      const { conditions } = currentNode.data;
      let matchingIndex = conditions.findIndex((condition) =>
        variableParserService.checkIfElseCondition(condition, {
          user: this.user,
          chat: { input: this.chatInput },
        })
      );

      //handle else case
      matchingIndex = matchingIndex === -1 ? conditions.length : matchingIndex;

      const edge = sourceEdges.find(
        ({ sourceHandle }) => sourceHandle === matchingIndex.toString()
      );

      if (!edge)
        throw new Error(
          `No edge found for if-else node id: ${currentNode.id} with input: ${this.chatInput}`
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

  private nudgeStartNodeHandler: GetNextNodeHandler<AppNodeKey.START_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for start node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private levelStartNodeHandler: GetNextNodeHandler<AppNodeKey.START_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      //clear the user score
      await this.updateUser({
        level_score: {},
      });

      if (!edge)
        throw new Error(`No edge found for start node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private promptNodeHandler: GetNextNodeHandler<AppNodeKey.PROMPT_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      await this.updateUser({
        node_meta: {
          ...(this.user.node_meta || {}),
          prompt_input: this.chatInput,
        },
      });

      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for prompt node id: ${currentNode.id}`);

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private whatsappButtonNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_BUTTON_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      if (!this.chatInput)
        throw new Error("Input is required for whatsapp button node");
      const { buttons } = currentNode.data;

      const matchingIndex = buttons.findIndex(
        (option) => option === this.chatInput
      );

      if (matchingIndex === -1) {
        //No matching option found
        return currentNode;
      }

      const edge = sourceEdges.find(
        (edge) => edge.sourceHandle?.toString() === matchingIndex.toString()
      );

      if (!edge)
        throw new Error(
          `No edge found for whatsapp button node id: ${currentNode.id} with edge: ${edge} and input: ${this.chatInput}`
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
        await this.updateUser({
          node_meta: {
            ...(this.user.node_meta || {}),
            delay_wait_till_unix: undefined,
          },
        });
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
    //TODO: test delay node in level flow
    const waitTill = this.user.node_meta?.delay_wait_till_unix;
    // console.log({
    //   waitTill: new Date(waitTill!).toISOString(),
    //   now: new Date().toISOString(),
    // });
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
    async ({ currentNode, sourceEdges }) => {
      if (!this.chatInput)
        throw new Error("Input is required for whatsapp list node");
      const { buttons, correctIndex } = currentNode.data;

      const matchingIndex = buttons.findIndex(
        (option) => option === this.chatInput
      );

      if (matchingIndex === -1) {
        //No matching option found
        return currentNode;
      }

      const edge = sourceEdges.find(
        (edge) => edge.sourceHandle?.toString() === matchingIndex.toString()
      );

      //update the user score
      const isCorrectAnswer = matchingIndex === correctIndex;
      const isAlreadyMarked = this.user.level_score[currentNode.id];

      if (!isAlreadyMarked) {
        await this.updateUser({
          level_score: {
            ...this.user.level_score,
            [currentNode.id]: isCorrectAnswer ? 1 : 0,
          },
          total_score: this.user.total_score + (isCorrectAnswer ? 1 : 0),
        });
      }

      if (!edge)
        throw new Error(
          `No edge found for whatsapp button node id: ${currentNode.id} with edge: ${edge} and input: ${this.chatInput}`
        );

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private levelWhatsappDocumentNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_DOCUMENT_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(
          `No edge found for whatsapp document node id: ${currentNode.id}`
        );

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

  private levelWhatsappUserUpdateNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_USER_UPDATE_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(
          `No edge found for whatsapp user update node id: ${currentNode.id}`
        );

      const nextNode = this.getNodeByIdOrFail(edge.target);

      return nextNode;
    };

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
          getNextNode: this.levelStartNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelStartNode,
        },
        nudge: {
          getNextNode: this.nudgeStartNodeHandler,
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
      [AppNodeKey.WHATSAPP_DOCUMENT_NODE_KEY]: {
        level: {
          getNextNode: this.levelWhatsappDocumentNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelWhatsappDocumentNode,
        },
      },
      [AppNodeKey.WHATSAPP_USER_UPDATE_NODE_KEY]: {
        level: {
          getNextNode: this.levelWhatsappUserUpdateNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelWhatsappUserUpdateNode,
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
