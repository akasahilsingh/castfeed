import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localPath) => {
  if (!localPath) return null;
  try {
    const response = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localPath);
    return response
  } catch (error) {
    console.log("Error while uploading to cloudinary: ", error.message);
    fs.unlinkSync(localPath);
  }
};

export {cloudinary, uploadOnCloudinary };
