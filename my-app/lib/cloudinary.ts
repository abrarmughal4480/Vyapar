import { buildUrl } from 'cloudinary-build-url';

const CLOUDINARY_CLOUD_NAME = 'dvpjxumzr';
const CLOUDINARY_API_KEY = '289488196559381';
const CLOUDINARY_API_SECRET = 'n8dY7bNLpTh6BUJ51szOraiRl3M';

export interface CloudinaryUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadImageToCloudinary = async (file: File): Promise<CloudinaryUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Upload API error:', data);
      throw new Error(`Upload failed: ${data.error || response.statusText}`);
    }
    
    return {
      success: data.success,
      url: data.url,
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

export const getCloudinaryUrl = (publicId: string, transformations?: any) => {
  return buildUrl(publicId, {
    cloud: {
      cloudName: CLOUDINARY_CLOUD_NAME,
    },
    transformations: transformations || {},
  });
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    // Note: Delete requires server-side implementation due to signature requirements
    // This is a placeholder for the client-side call to your backend
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
};
