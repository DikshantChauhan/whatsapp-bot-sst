import { flowService } from "../services/db/flow.service";
import { nudgeService } from "../services/db/nudge.service";
import { userService } from "../services/db/user.service";
import WalkFlowService from "../services/walkFlow/walkFlow.service";

const handler = async () => {
  const startTime = Date.now();
  const timeoutThreshold = 20 * 1000; // 20 seconds in milliseconds

  while (true) {
    // Check if enough time remains before fetching a new batch
    if (Date.now() - startTime >= timeoutThreshold) {
      console.log("Not enough time left, stopping further processing.");
      break;
    }

    // Fetch a batch of 20 nudges
    const pastNudges = await nudgeService.getPastNudges(Date.now(), 20);

    console.log("batch length ", pastNudges);
    if (pastNudges.length === 0) {
      console.log("No more nudges to process.");
      break;
    }

    for (const nudge of pastNudges) {
      // Check remaining time before processing each nudge
      if (Date.now() - startTime >= timeoutThreshold) {
        console.log(
          "Less than 20 seconds remaining, stopping further processing."
        );
        break;
      }

      const flow = await flowService.getOrFail(nudge.nudge_id);
      const user = await userService.getOrFail(nudge.user_id);
      const walkFlow = new WalkFlowService({ flow, user });

      await walkFlow.walk(nudge.node_id);
    }
  }
};

export default handler;
