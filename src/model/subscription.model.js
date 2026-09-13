import mongoose, { mongo, Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: { // SubscribedTo
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: { // Subscriber
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
