import cloudinary from 'cloudinary';
import { v2 as cloudinaryV2 } from 'cloudinary';

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadProfileImage(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.upload_stream(
      {
        folder: 'vyapar/profile',
        public_id: filename,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
} 