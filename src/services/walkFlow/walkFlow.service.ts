import { Flow } from "./typings";
import NodeHandlerService from "./nodeHandler.service";
import { Campaign } from "../../db/campaign.db";
import { User } from "../../db/user.db";

class WalkFlowService extends NodeHandlerService {
  constructor(payload: {
    flow: Flow;
    campaign?: Campaign;
    user: User;
    chatInput?: string;
  }) {
    super(payload);
  }

  walk = async (currentNodeId: string) => {
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
