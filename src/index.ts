import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import serverless from "serverless-http";
import miscController from "./controller/misc.controller";
import whatsappWebhookController from "./controller/whatsappWebhook/whatsappWebhook.controller";
import flowController from "./controller/flow.controller";

dotenv.config();

const app = express();

app.use(bodyParser.json());

app.post("/webhook", whatsappWebhookController.webhook);
app.get("/webhook", whatsappWebhookController.webhook);

app.post("/flows", flowController.postFlow);
app.get("/flows", flowController.getFlows);

app.post("/reset-flow", miscController.resetUserFlow);
app.get("/test", miscController.test);
app.delete("/delete-user", miscController.deleteUser);

export const handler = serverless(app);
