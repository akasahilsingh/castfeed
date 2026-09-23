import api from "./client";

export const createTweet = (content: string) =>
  api.post("/tweet/", { content });

export const getUserTweets = (userId: string) =>
  api.get(`/tweet/user/${userId}`);

export const updateTweet = (tweetId: string, content: string) =>
  api.patch(`/tweet/${tweetId}`, { content });

export const deleteTweet = (tweetId: string) =>
  api.delete(`/tweet/${tweetId}`);
