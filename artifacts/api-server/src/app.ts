/**
 * api-server — Express application factory (dev import / tests).
 *
 * Production entry is index.ts which opens the port with health probes first,
 * then dynamically loads attach-routes.ts.
 */
import express, { type Express } from "express";
import { attachRoutes } from "./attach-routes";

const app: Express = express();
attachRoutes(app);

export default app;
