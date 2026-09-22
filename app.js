import cookieParser from "cookie-parser";
import express, { urlencoded } from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.static("public"));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(urlencoded({ extended: true, limit: "16kb" }));

// Routes Import
import userRouter from "./src/routes/user.routes.js";
import videoRouter from "./src/routes/video.routes.js";
import commentRouter from "./src/routes/comment.routes.js";
import dashBoardRouter from "./src/routes/dashboard.route.js";
import healthcheckRouter from "./src/routes/healthcheck.route.js";
import likeRouter from "./src/routes/like.route.js";
import playlistRouter from "./src/routes/playlist.route.js";
import subscriptionRouter from "./src/routes/subscription.route.js";
import tweetRouter from "./src/routes/tweet.route.js";
app.use("/api/v1/users", userRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/dashboard", dashBoardRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/tweet", tweetRouter);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
  });
});

export default app;
