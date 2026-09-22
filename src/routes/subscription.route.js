import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/c/:channelId").post(toggleSubscription);

router.route("/u/:channelId").get(getUserChannelSubscribers);

router.route("/my-channels").get(getSubscribedChannels);
// router
//     .route("/c/:channelId")
//     .get(getSubscribedChannels)
//     .post(toggleSubscription);

// router.route("/u/:subscriberId").get(getUserChannelSubscribers);

export default router;
