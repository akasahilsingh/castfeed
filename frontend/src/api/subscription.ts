import api from "./client";

export const toggleSubscription = (channelId: string) =>
  api.post(`/subscription/c/${channelId}`);

export const getChannelSubscribers = (channelId: string) =>
  api.get(`/subscription/u/${channelId}`);

export const getSubscribedChannels = () =>
  api.get("/subscription/my-channels");