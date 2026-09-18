import { Router } from "express";
import { addComment, getVideoComments } from "../controllers/comment.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/get-comment").get(getVideoComments);
router.route("/:videoId").post(verifyJwt, addComment)

export default router;
