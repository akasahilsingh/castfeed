import { Router } from "express";
import { verifyJwt, verifyJwtOptional } from "../middleware/auth.middleware.js";
import {
  completeVideoUpload,
  deleteVideo,
  // generateUploadSignature,
  getAllVideos,
  getVideoById,
  // publishAVideo,
  togglePublishStatus,
  updateVideo,
  uploadInit,
} from "../controllers/video.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// router.route("/post-video").post(
//   verifyJwt,
//   upload.fields([
//     {
//       name: "video",
//       maxCount: 1,
//     },
//     {
//       name: "thumbnail",
//       maxCount: 1,
//     },
//   ]),
//   publishAVideo,
// );

// router.post("/upload-signature", verifyJwt, generateUploadSignature);
router.route("/upload-init").post(verifyJwt, uploadInit);

router.post("/upload-complete", verifyJwt, completeVideoUpload);

router.route("/get-all-videos").get(getAllVideos);
router
  .route("/:videoId")
  .get(verifyJwtOptional, getVideoById)
  .patch(verifyJwt, upload.single("thumbnail"), updateVideo)
  .delete(verifyJwt, deleteVideo)
  .post(verifyJwt, togglePublishStatus);

export default router;
