import { User } from "../../db/user.db";
import { AppNode, AppNodeKey, Edge, Flow } from "./typings";
import { campaignService } from "../db/campaign.service";
import { flowService } from "../db/flow.service";
import { Campaign } from "../../db/campaign.db";
import SendNodesService from "../whatsapp/sendNode.service";
import { getDataFromWhatsappOwnboaringLink, getStartNode } from "../../utils";
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
    this.campaign = await campaignService.getOrFail(
      this.user.current_campaign_id
    );
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

  public getEdgeBySourceHandleOrFail = (
    sourceEdges: Edge[],
    sourceHandleIndex: string,
    node: AppNode
  ): Edge => {
    const edge = sourceEdges.find(
      (edge) => edge.sourceHandle === sourceHandleIndex
    );
    if (!edge)
      throw new Error(
        `No edge found for ${node.type} node id: ${node.id} with sourceHandleIndex: ${sourceHandleIndex}`
      );
    return edge;
  };

  public getNodeBySourceHandleOrFail = (
    sourceEdges: Edge[],
    currentNode: AppNode,
    handleIndex: string
  ): AppNode => {
    const edge = this.getEdgeBySourceHandleOrFail(
      sourceEdges,
      handleIndex,
      currentNode
    );

    return this.getNodeByIdOrFail(edge.target);
  };

  public getNodeByEdgeIndexOrFail = (
    sourceEdges: Edge[],
    currentNode: AppNode,
    edgeIndex: number
  ): AppNode => {
    const edge = sourceEdges[edgeIndex];

    if (!edge)
      throw new Error(
        `No edge found for ${currentNode.type} id: ${currentNode.id} with edgeIndex: ${edgeIndex}`
      );

    return this.getNodeByIdOrFail(edge.target);
  };

  public getChatInputOrFail = (currentNode: AppNode): string => {
    if (!this.chatInput)
      throw new Error(
        `No chat input found for ${currentNode.type} id: ${currentNode.id}`
      );
    return this.chatInput;
  };

  private ifElseNodeHandler: GetNextNodeHandler<AppNodeKey.IF_ELSE_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const chatInput = this.getChatInputOrFail(currentNode);

      const { conditions } = currentNode.data;
      let matchingIndex = conditions.findIndex((condition) =>
        variableParserService.checkIfElseCondition(condition, {
          user: this.user,
          chat: { input: chatInput },
        })
      );

      //handle else case
      matchingIndex = matchingIndex === -1 ? conditions.length : matchingIndex;

      return this.getNodeBySourceHandleOrFail(
        sourceEdges,
        currentNode,
        matchingIndex.toString()
      );
    };

  private messageNodeHandler: GetNextNodeHandler<AppNodeKey.MESSAGE_NODE_KEY> =
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private nudgeStartNodeHandler: GetNextNodeHandler<AppNodeKey.START_NODE_KEY> =
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private levelStartNodeHandler: GetNextNodeHandler<AppNodeKey.START_NODE_KEY> =
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private promptNodeHandler: GetNextNodeHandler<AppNodeKey.PROMPT_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      await this.updateUser({
        prompt_input: this.chatInput,
      });

      return this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);
    };

  private whatsappButtonNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_BUTTON_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const chatInput = this.getChatInputOrFail(currentNode);
      const { buttons } = currentNode.data;

      const matchingIndex = buttons.findIndex((option) => option === chatInput);

      if (matchingIndex === -1) {
        //No matching option found
        return currentNode;
      }

      return this.getNodeBySourceHandleOrFail(
        sourceEdges,
        currentNode,
        matchingIndex.toString()
      );
    };

  private levelEndNodeHandler: GetNextNodeHandler<AppNodeKey.END_NODE_KEY> =
    async ({ currentNode }) => {
      const campaign = await this.getOrFetchCampaign();

      const currentLevelIndex = campaign.levels.findIndex(
        (level) => level === this.user.current_level_id
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
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private levelDelayNodeHandler: GetNextNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      if (this.isLevelDelayResolved()) {
        await this.updateUser({
          delay_wait_till_unix: undefined,
        });

        return this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);
      }

      return currentNode;
    };

  private nudgeDelayNodeHandler: GetNextNodeHandler<AppNodeKey.DELAY_NODE_KEY> =
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private isLevelDelayResolved = (): boolean => {
    //TODO: test delay node in level flow
    const waitTill = this.user.delay_wait_till_unix;
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
      const chatInput = this.getChatInputOrFail(currentNode);
      const { buttons, correctIndex } = currentNode.data;

      const matchingIndex = buttons.findIndex((option) => option === chatInput);

      if (matchingIndex === -1) {
        //No matching option found
        return currentNode;
      }

      //update the user score
      const isCorrectAnswer = matchingIndex === correctIndex;
      const isAlreadyMarked = this.user.current_level_score[currentNode.id];

      if (!isAlreadyMarked) {
        await this.updateUser({
          current_level_score: {
            ...this.user.current_level_score,
            [currentNode.id]: isCorrectAnswer ? 1 : 0,
          },
          total_score: this.user.total_score + (isCorrectAnswer ? 1 : 0),
        });
      }

      return this.getNodeBySourceHandleOrFail(
        sourceEdges,
        currentNode,
        matchingIndex.toString()
      );
    };

  private levelWhatsappDocumentNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_DOCUMENT_NODE_KEY> =
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private levelWhatsappUserUpdateNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_USER_UPDATE_NODE_KEY> =
    async ({ currentNode, sourceEdges }) =>
      this.getNodeByEdgeIndexOrFail(sourceEdges, currentNode, 0);

  private levelWhatsappOwnboardingLinkParserNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_OWNBOARDING_LINK_PARSER_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const { link, paths } = currentNode.data;

      const {
        whatsapp_ownboarding_district_id,
        whatsapp_ownboarding_district_name,
        whatsapp_ownboarding_state_name,
        whatsapp_ownboarding_dise_code,
        whatsapp_ownboarding_school_name,
      } = getDataFromWhatsappOwnboaringLink(link);

      let selectedPath: (typeof paths)[number];

      if (
        whatsapp_ownboarding_district_id &&
        whatsapp_ownboarding_district_name &&
        whatsapp_ownboarding_state_name
      ) {
        selectedPath = "teacher";
      } else if (
        whatsapp_ownboarding_dise_code &&
        whatsapp_ownboarding_school_name
      ) {
        selectedPath = "student";
      } else {
        selectedPath = "unknown";
      }

      return this.getNodeBySourceHandleOrFail(
        sourceEdges,
        currentNode,
        paths.indexOf(selectedPath).toString()
      );
    };

  private levelWhatsappValidateDiseCodeNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_VALIDATE_DISE_CODE_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const { diseCode, paths } = currentNode.data;

      //

      //call api with meta and diseCode and set school name
      const schoolName = "SGRR public school";
      schoolName &&
        (await this.updateUser({
          whatsapp_ownboarding_school_name: schoolName,
          whatsapp_ownboarding_dise_code: diseCode,
        }));

      return this.getNodeBySourceHandleOrFail(
        sourceEdges,
        currentNode,
        paths.indexOf(schoolName ? "valid" : "invalid").toString()
      );
    };

  private levelWhatsappConfirmSchoolNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_CONFIRM_SCHOOL_NODE_KEY> =
    async ({ currentNode, sourceEdges }) => {
      const { paths } = currentNode.data;
      const matchingIndex = paths.findIndex((path) => path === this.chatInput);

      if (matchingIndex === -1) {
        //No matching option found
        return currentNode;
      }

      return this.getNodeBySourceHandleOrFail(
        sourceEdges,
        currentNode,
        matchingIndex.toString()
      );
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
          pauseAfterExecution:
            this.flow.id ===
            this.campaign?.levels[this.campaign.levels.length - 1],
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
      [AppNodeKey.WHATSAPP_OWNBOARDING_LINK_PARSER_NODE_KEY]: {
        level: {
          getNextNode: this.levelWhatsappOwnboardingLinkParserNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.sendLevelWhatsappOwnboardingLinkParserNode,
        },
      },
      [AppNodeKey.WHATSAPP_VALIDATE_DISE_CODE_NODE_KEY]: {
        level: {
          getNextNode: this.levelWhatsappValidateDiseCodeNodeHandler,
          pauseAfterExecution: false,
          sendNode: this.logAndUpdateUserAfterLevelWalk,
        },
      },
      [AppNodeKey.WHATSAPP_CONFIRM_SCHOOL_NODE_KEY]: {
        level: {
          getNextNode: this.levelWhatsappConfirmSchoolNodeHandler,
          pauseAfterExecution: true,
          sendNode: this.sendLevelWhatsappConfirmSchoolNode,
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
