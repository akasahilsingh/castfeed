import { Router } from "express";
import {
  addComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router
  .route("/:videoId")
  .post(verifyJwt, addComment)
  .get(getVideoComments)

router
    .route("/c/:commentId")
    .patch(verifyJwt, updateComment);

export default router;
