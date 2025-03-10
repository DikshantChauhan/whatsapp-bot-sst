import { Flow } from "./typings";
import NodeHandlerService from "./nodeHandler.service";
import { Campaign } from "../../db/campaign.db";
import { User } from "../../db/user.db";
import { flowService } from "../db/flow.service";
import { getStartNode } from "../../utils";

class WalkFlowService extends NodeHandlerService {
  constructor(payload: {
    flow: Flow;
    campaign?: Campaign;
    user: User;
    chatInput?: string;
  }) {
    super(payload);
  }

  private isCommandCase = () => {
    return this.flow.type === "level" && this.chatInput!.startsWith("/");
  };

  private helpCommandHandler = async (_: string) => {
    await this.sendTextMessage(
      this.user.phone_number,
      "Available commands:\n\n*/help* - Show this help message\n\n*/levels* - List all available levels\n\n*/level-<number>* - Switch to a specific level (e.g. `/level-1`)"
    );
  };

  private levelsCommandHandler = async (_: string) => {
    const levelsIds = this.campaign!.levels;
    const levels = await Promise.all(
      levelsIds.map((levelId) => flowService.getOrFail(levelId))
    );

    const userMaxLevelIndex = this.campaign!.levels.indexOf(
      this.user.max_level_id
    );
    const levelsString = levels.reduce((acc, level, index) => {
      const isLevelUnlocked = index <= userMaxLevelIndex;
      return `${acc}\n\nLevel ${index + 1} ${isLevelUnlocked ? "" : "🔒"}: ${
        level.name
      }`;
    }, "To switch to a level, use the command /level-<level-id>, example: /level-1");

    await this.sendTextMessage(this.user.phone_number, levelsString);
  };

  private levelCommandHandler = async (command: string) => {
    //Validate level number
    const levelNumber = command.split("-")[1];
    const levelIndex = parseInt(levelNumber!) - 1;
    const levelId = this.campaign!.levels[levelIndex]!;
    const flow = await flowService.getOrFail(levelId);
    const startNode = getStartNode(flow)!;
    // ---------------------

    await this.updateUser({ level_id: levelId, node_id: startNode.id });
  };

  private handleCommand = async () => {
    const command = this.chatInput!.slice(1);

    const map = [
      { match: "help", handler: this.helpCommandHandler },
      { match: "levels", handler: this.levelsCommandHandler },
      { match: /^level-\d+$/, handler: this.levelCommandHandler },
    ];

    map.forEach(({ match, handler }) => {
      const pattern = new RegExp(match);
      pattern.exec(command) && handler(command);
    });
  };

  walk = async (currentNodeId: string) => {
    if (this.isCommandCase()) {
      await this.handleCommand();
      return;
    }

    const nodesHandlerMap = this.getNodesHandlerMap();
    let currentNode = this.getNodeByIdOrFail(currentNodeId);

    while (true) {
      const getNextNode =
        nodesHandlerMap[currentNode.type][this.flow.type]?.getNextNode;

      if (!getNextNode) {
        throw new Error(`type: ${currentNode.type}, handlers not found!`);
      }

      const nextNode = await getNextNode({
        currentNode,
        sourceEdges: this.getNodeSourceEdges(currentNode.id),
      });

      const nextNodeHandlers = nodesHandlerMap[nextNode.type][this.flow.type];

      if (!nextNodeHandlers) {
        throw new Error(`type: ${nextNode.type}, handlers not found!`);
      }

      await nextNodeHandlers.sendNode(nextNode);

      if (nextNodeHandlers.pauseAfterExecution) {
        //Idley: nudge creation should be here after walk end (assuming walk completion without error)
        //currently its happening after node send
        break;
      }

      currentNode = nextNode;
    }
  };
}

export default WalkFlowService;
