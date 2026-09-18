import express, { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  updateVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/post-video").post(
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo,
);

router.route("/get-all-videos").get(getAllVideos);
router.route("/:videoId").get(getVideoById).patch(upload.single("thumbnail"), updateVideo).delete(deleteVideo);


export default router;
