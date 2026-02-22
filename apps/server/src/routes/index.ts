import { Hono } from "hono";
import { API_PREFIX } from "@/config/constants";
import healthRoutes from "./health.routes";
import managementRoutes from "./management.routes";
import matchRoutes from "./match.routes";
import playerRoutes from "./player.routes";
import scoringRoutes from "./scoring.routes";
import teamRoutes from "./team.routes";
import uploadRoutes from "./upload.routes";

const apiRoutes = new Hono();

// Mount all routes
apiRoutes.route("/health", healthRoutes);
apiRoutes.route("/matches", matchRoutes);
apiRoutes.route("/teams", teamRoutes);
apiRoutes.route("/players", playerRoutes);
apiRoutes.route("/scoring", scoringRoutes);
apiRoutes.route("/uploads", uploadRoutes);
apiRoutes.route("/", managementRoutes);

// Create main API router with version prefix
const routes = new Hono();
routes.route(API_PREFIX, apiRoutes);

export default routes;
