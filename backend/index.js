import "dotenv/config";
import app from "./app.js";
import connectDB from "./src/db/db.js";
const port = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is started on port: ${port}`);
    });
  } catch (error) {
    console.log(`Error while starting the server: ${error.message}`);
    process.exit(1);
  }
};


startServer();