import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGO DB URI is not defined");
    }
    const data = await mongoose.connect(MONGODB_URI);
    console.log(
      `Successfully connected to Database host: ${data.connection.host}`,
    );
  } catch (error) {
    console.log("Error while connecting to DB!!: ", error.message);
    throw error;
  }
};

export default connectDB;
