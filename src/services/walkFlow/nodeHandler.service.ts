import { User } from "../../db/user.db";
import { userService } from "../db/user.service";
import { GetNextNodeHandler } from "./walkFlow";
import { AppNode, AppNodeKey, DelayNode, Edge, Flow } from "./typings";

class NodeHandlerService {
  private flow: Flow;

  constructor(flow: Flow) {
    this.flow = flow;
  }

  public getStartNode = (): AppNode | undefined => {
    return this.flow.data.nodes.find(
      (node: AppNode) => node.type === AppNodeKey.START_NODE_KEY
    );
  };

  public getNodeById = (id: string): AppNode | undefined => {
    return this.flow.data.nodes.find((node: AppNode) => node.id === id);
  };

  public getNodeSourceEdges = (nodeId: string): Edge[] => {
    const sourceEdges = this.flow.data.edges.filter(
      (edge) => edge.source === nodeId
    );
    return sourceEdges;
  };

  public ifElseNodeHandler: GetNextNodeHandler<AppNodeKey.IF_ELSE_NODE_KEY> = ({
    node,
    input,
    sourceEdges,
  }) => {
    if (!input) throw new Error("Input is required for if-else node");

    const { conditions } = node.data;
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
        `No edge found for if-else node id: ${node.id} with input: ${input}`
      );

    const nextNode = this.getNodeById(edge.target);
    if (!nextNode)
      throw new Error(
        `No next node found for if-else node id: ${node.id} with edge: ${edge} and input: ${input}`
      );

    return nextNode;
  };

  public messageNodeHandler: GetNextNodeHandler<AppNodeKey.MESSAGE_NODE_KEY> =
    ({ node, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for message node id: ${node.id}`);

      const nextNode = this.getNodeById(edge.target);

      if (!nextNode)
        throw new Error(
          `No next node found for message node id: ${node.id} with edge: ${edge}`
        );

      return nextNode;
    };

  public startNodeHandler: GetNextNodeHandler<AppNodeKey.START_NODE_KEY> = ({
    node,
    sourceEdges,
  }) => {
    const edge = sourceEdges[0];

    if (!edge) throw new Error(`No edge found for start node id: ${node.id}`);

    const nextNode = this.getNodeById(edge.target);

    if (!nextNode)
      throw new Error(
        `No next node found for start node id: ${node.id} with edge: ${edge}`
      );

    return nextNode;
  };

  public promptNodeHandler: GetNextNodeHandler<AppNodeKey.PROMPT_NODE_KEY> = ({
    node,
    sourceEdges,
  }) => {
    const edge = sourceEdges[0];

    if (!edge) throw new Error(`No edge found for prompt node id: ${node.id}`);

    const nextNode = this.getNodeById(edge.target);

    if (!nextNode)
      throw new Error(
        `No next node found for prompt node id: ${node.id} with edge: ${edge}`
      );

    return nextNode;
  };

  public whatsappButtonNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_BUTTON_NODE_KEY> =
    ({ node, sourceEdges, input }) => {
      if (!input) throw new Error("Input is required for whatsapp button node");
      const { buttons } = node.data;

      const matchingIndex = buttons.findIndex((option) => option === input);

      if (matchingIndex === -1) {
        //No matching option found
        return node;
      }

      const edge = sourceEdges.find(
        (edge) => edge.sourceHandle?.toString() === matchingIndex.toString()
      );

      if (!edge)
        throw new Error(
          `No edge found for whatsapp button node id: ${node.id} with edge: ${edge} and input: ${input}`
        );

      const nextNode = this.getNodeById(edge.target);

      if (!nextNode)
        throw new Error(
          `No next node found for whatsapp button node id: ${node.id} with edge: ${edge} and input: ${input}`
        );

      return nextNode;
    };

  public endNodeHandler: GetNextNodeHandler<AppNodeKey.END_NODE_KEY> = ({
    node,
  }) => {
    return node;
  };

  public whatsappVideoNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_VIDEO_NODE_KEY> =
    ({ node, sourceEdges }) => {
      const edge = sourceEdges[0];

      if (!edge)
        throw new Error(`No edge found for whatsapp video node id: ${node.id}`);

      const nextNode = this.getNodeById(edge.target);

      if (!nextNode)
        throw new Error(
          `No next node found for whatsapp video node id: ${node.id} with edge: ${edge}`
        );

      return nextNode;
    };

  public delayNodeHandler: GetNextNodeHandler<AppNodeKey.DELAY_NODE_KEY> = ({
    node,
    sourceEdges,
    user,
  }) => {
    const waitTill = user.node_meta?.delayWaitTill;

    if (!waitTill) {
      throw new Error(
        `No delayWaitTill found for delay node id: ${node.id} with user: ${user.phone_number}`
      );
    } else if (waitTill > Date.now()) {
      return node;
    }

    const edge = sourceEdges[0];
    if (!edge) throw new Error(`No edge found for delay node id: ${node.id}`);

    const nextNode = this.getNodeById(edge.target);
    if (!nextNode)
      throw new Error(
        `No next node found for delay node id: ${node.id} with edge: ${edge}`
      );
    return nextNode;
  };

  public setDelayNodeMeta = async (user: User, node: DelayNode) => {
    if (user.node_meta?.delayWaitTill) return;
    const { delayInSecs } = node.data;
    await userService.update({
      ...user,
      node_meta: {
        ...(user.node_meta || {}),
        delayWaitTill: Date.now() + delayInSecs * 1000,
      },
    });
  };

  public whatsappListNodeHandler: GetNextNodeHandler<AppNodeKey.WHATSAPP_LIST_NODE_KEY> =
    this.whatsappButtonNodeHandler as any;
}

export default NodeHandlerService;
