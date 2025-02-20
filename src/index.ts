import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import serverless from "serverless-http";
import whatsappWebhookController from "./controller/whatsappWebhook/whatsappWebhook.controller";
import flowController from "./controller/flow.controller";
import userController from "./controller/user.controller";
import campaignController from "./controller/campaign.controller";
import miscController from "./controller/misc.controller";

dotenv.config();

const app = express();

app.use(bodyParser.json());

app.post("/webhook", whatsappWebhookController.webhook);
app.get("/webhook", whatsappWebhookController.webhook);

//flows
app.post("/flow", flowController.postFlow);
app.get("/flow/:id", flowController.getFlow);
app.get("/flow/:type/all", flowController.getAllByType);
app.put("/flow/:id", flowController.updateFlow);
app.delete("/flow/:id", flowController.delete);

// User
app.get("/users", userController.all);
app.get("/user/:phone_number", userController.get);

//campaign
app.get("/campaigns", campaignController.getAll);
app.get("/campaign/:id", campaignController.get);
app.post("/campaign", campaignController.create);
app.put("/campaign/:id", campaignController.update);

//misc
app.post("/test", miscController.testHandler);
app.post("/create-nudge-seed", miscController.createNudgeSeedHandler);
app.get("/scan-all-nudges", miscController.scanAllNudgesHandler);
app.post("/get-past-nudges", miscController.getPastNudgesHandler);
app.delete("/delete-all-nudges", miscController.deleteAllNudgesHandler);

export const handler = serverless(app);
