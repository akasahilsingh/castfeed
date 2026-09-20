import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { createPlaylist } from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(createPlaylist);
export default router;
