import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'products'
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `criatividade-amor/${folder}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    throw new Error('Falha no upload da imagem');
  }
};

export const deleteFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extrair o public_id da URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = parts[parts.length - 2];

    await cloudinary.uploader.destroy(`criatividade-amor/${folder}/${publicId}`);
  } catch (error) {
    console.error('Erro ao deletar imagem do Cloudinary:', error);
  }
};

export default cloudinary;
