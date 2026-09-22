import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { getUserChannelProfile } from "../controllers/user.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/c/:channelId").post(toggleSubscription);
router.route("/u/:channelId").get(getUserChannelSubscribers);
// router
//     .route("/c/:channelId")
//     .get(getSubscribedChannels)
//     .post(toggleSubscription);

// router.route("/u/:subscriberId").get(getUserChannelSubscribers);

export default router;
