import { flowService } from "../services/db/flow.service";
import { nudgeService } from "../services/db/nudge.service";
import { userService } from "../services/db/user.service";
import WalkFlowService from "../services/walkFlow/walkFlow.service";

const handler = async () => {
  const currentTime = Date.now();

  const pastNudges = await nudgeService.getPastNudges(currentTime, 20);

  for (const nudge of pastNudges) {
    const flow = await flowService.getOrFail(nudge.nudge_id);
    const user = await userService.getOrFail(nudge.user_id);
    const walkFlow = new WalkFlowService({
      flow,
      user,
    });

    await walkFlow.walk(nudge.node_id);
  }
};

export default handler;
