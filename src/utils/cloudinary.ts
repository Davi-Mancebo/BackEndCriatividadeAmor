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

console.log('[Cloudinary] Configuração carregada para o cloud:', cloudName || 'indefinido');

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'products'
): Promise<string> => {
  try {
    const isDigitalAsset = folder.includes('digital');

    const uploadOptions: Record<string, any> = {
      folder: `criatividade-amor/${folder}`,
      resource_type: isDigitalAsset ? 'raw' : 'image',
      access_mode: 'public',
      use_filename: true,
      unique_filename: true,
    };

    if (!isDigitalAsset) {
      uploadOptions.transformation = [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ];
    }

    console.log('[Cloudinary] Iniciando upload:', {
      filePath,
      folder,
      resourceType: uploadOptions.resource_type,
      accessMode: uploadOptions.access_mode,
    });

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    console.log('[Cloudinary] Upload concluído:', {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      resourceType: result.resource_type,
      type: result.type,
      accessMode: result.access_mode,
    });

    if (isDigitalAsset && result.public_id) {
      try {
        await cloudinary.api.update(result.public_id, {
          resource_type: 'raw',
          type: 'upload',
          access_mode: 'public',
        });
        console.log('[Cloudinary] Access mode forçado para public:', result.public_id);
      } catch (updateError) {
        console.warn('Não foi possível definir o arquivo digital como público:', updateError);
      }
    }

    return result.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    throw new Error('Falha no upload do arquivo');
  }
};

const inferResourceType = (segments: string[]) => {
  const candidates = ['image', 'video', 'raw'];
  return segments.find((segment) => candidates.includes(segment)) || 'image';
};

const extractPublicIdAndFormat = (assetUrl: string) => {
  try {
    const url = new URL(assetUrl);
    const paramsPublicId = url.searchParams.get('public_id');

    if (paramsPublicId) {
      const decoded = decodeURIComponent(paramsPublicId);
      const lastDot = decoded.lastIndexOf('.');
      const hasExtension = lastDot !== -1;

      const extractedFromParams = {
        resourceType: inferResourceType(url.pathname.split('/')),
        type: url.searchParams.get('type') || 'upload',
        publicId: hasExtension ? decoded.slice(0, lastDot) : decoded,
        format: hasExtension ? decoded.slice(lastDot + 1) : undefined,
        version: url.searchParams.get('version') || undefined,
      };

      console.log('[Cloudinary] Extraído via query params:', extractedFromParams);
      return extractedFromParams;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.findIndex((segment) => segment === 'upload');
    if (uploadIndex === -1) {
      return null;
    }

    const resourceType = segments[uploadIndex - 1] || 'image';
    const versionAndRest = segments.slice(uploadIndex + 1);
    if (versionAndRest.length < 2) {
      return null;
    }

    const versionSegment = versionAndRest[0];
    const version = versionSegment.startsWith('v') ? versionSegment.slice(1) : undefined;
    const publicWithExt = versionAndRest.slice(1).join('/');
    const lastDot = publicWithExt.lastIndexOf('.');
    const hasExtension = lastDot !== -1;

    // Para arquivos 'raw', Cloudinary requer public_id COM extensão na deleção
    const shouldKeepExtension = resourceType === 'raw' && hasExtension;

    const extractedFromPath = {
      resourceType,
      type: segments[uploadIndex] || 'upload',
      publicId: shouldKeepExtension ? publicWithExt : (hasExtension ? publicWithExt.slice(0, lastDot) : publicWithExt),
      format: hasExtension ? publicWithExt.slice(lastDot + 1) : undefined,
      version,
    };

    console.log('[Cloudinary] Extraído via path:', extractedFromPath);
    return extractedFromPath;
  } catch {
    console.warn('[Cloudinary] Falha ao analisar URL do asset:', assetUrl);
    return null;
  }
};

export const generateSignedDownloadUrl = (
  assetUrl: string,
  options: { expiresInSeconds?: number } = {}
) => {
  const extracted = extractPublicIdAndFormat(assetUrl);
  if (!extracted) {
    return assetUrl;
  }

  const { publicId, format, resourceType, version, type } = extracted;
  const expiresAt = Math.floor(Date.now() / 1000) + (options.expiresInSeconds ?? 300);
  const parsedVersion = version ? Number(version) : undefined;

  console.log('[Cloudinary] Gerando URL assinada:', {
    sourceUrl: assetUrl,
    metadata: extracted,
    expiresAt,
  });

  try {
    if (resourceType === 'raw') {
      const filenameBase = publicId.split('/').pop() || 'download';
      const downloadName = format ? `${filenameBase}.${format}` : filenameBase;

      const privateDownloadOptions: any = {
        resource_type: 'raw',
        type: type || 'upload',
        expires_at: expiresAt,
        attachment: true,
        target_filename: downloadName,
      };

      const signedPrivateUrl = cloudinary.utils.private_download_url(publicId, format || '', privateDownloadOptions);
      console.log('[Cloudinary] URL privada gerada:', signedPrivateUrl);
      return signedPrivateUrl;
    }

    const signedCdnUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: type || 'upload',
      secure: true,
      format,
      sign_url: true,
      expires_at: expiresAt,
      version: parsedVersion,
    });

    console.log('[Cloudinary] URL CDN gerada:', signedCdnUrl);
    return signedCdnUrl;
  } catch (error) {
    console.error('Erro ao gerar URL assinada do Cloudinary:', error);
    return assetUrl;
  }
};

type CloudinaryDeletionResult = {
  success: boolean;
  reason?: string;
  result?: Record<string, any>;
};

export const deleteFromCloudinary = async (assetUrl: string): Promise<CloudinaryDeletionResult> => {
  try {
    const extracted = extractPublicIdAndFormat(assetUrl);
    if (!extracted) {
      console.warn('[Cloudinary] Não foi possível extrair public_id para deleção:', assetUrl);
      return { success: false, reason: 'missing_public_id' };
    }

    console.log('[Cloudinary] Deletando asset:', {
      publicId: extracted.publicId,
      resourceType: extracted.resourceType,
      type: extracted.type,
    });

    const result = await cloudinary.uploader.destroy(extracted.publicId, {
      resource_type: extracted.resourceType as 'image' | 'raw',
      type: extracted.type as 'upload' | 'private' | 'authenticated' | undefined,
    });

    console.log('[Cloudinary] Resultado da deleção:', result);

    const deletionSucceeded = ['ok', 'not found'].includes(result?.result);
    if (!deletionSucceeded) {
      console.error('[Cloudinary] Falha ao deletar asset:', result);
    }

    return {
      success: deletionSucceeded,
      reason: deletionSucceeded ? undefined : result?.result || 'unknown_error',
      result,
    };
  } catch (error) {
    console.error('Erro ao deletar imagem do Cloudinary:', error);
    return {
      success: false,
      reason: 'exception',
      result: error instanceof Error ? { message: error.message } : undefined,
    };
  }
};

export default cloudinary;
