import { Request, Response } from "express";
import { Flow } from "../services/flow/typings";
import s3Service from "../services/s3.service";

const postFlow = async (req: Request, res: Response) => {
  const flow = req.body.flow as Flow;

  if (!flow) {
    res.status(400).json({ message: "Flow is required" });
    return;
  }

  if (!flow.name) {
    res.status(400).json({ message: "Flow name is required" });
    return;
  }
  if (!flow.data.nodes || !Array.isArray(flow.data.nodes)) {
    res.status(400).json({ message: "Flow nodes must be an array" });
    return;
  }
  if (!flow.data.edges || !Array.isArray(flow.data.edges)) {
    res.status(400).json({ message: "Flow edges must be an array" });
    return;
  }

  await s3Service.postFlow(flow);
  res.status(200).json({ message: "Flow posted successfully" });
  return;
};

const getFlows = async (_: Request, res: Response) => {
  const flows = await s3Service.getAllFlows();
  res.status(200).json(flows);
  return;
};

export default { postFlow, getFlows };
