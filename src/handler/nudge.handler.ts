import { nudgeService } from "../services/db/nudge.service";

const handler = async () => {
  const currentTime = Date.now();

  const pastNudges = await nudgeService.getPastNudges(currentTime, 10);

  for (const nudge of pastNudges) {
    const nudgeFlow = await flowService.getOrFail(nudge.nudge_id);
    await walkNudge(nudge, nudgeFlow);
  }
};

export default handler;
