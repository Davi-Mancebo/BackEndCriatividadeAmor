import { v2 as cloudinary } from 'cloudinary';

// Validar configuração do Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ CLOUDINARY não configurado corretamente:');
  console.error('Cloud Name:', cloudName ? '✅' : '❌');
  console.error('API Key:', apiKey ? '✅' : '❌');
  console.error('API Secret:', apiSecret ? '✅' : '❌');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
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
