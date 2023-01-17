import { IZsStrapiAsset } from '../session/operations/operation.interfaces';

interface ImageResponsiveSource {
  src: string;
  srcSet: string;
}

export const getResponsiveImageSource = (asset: IZsStrapiAsset) => {
  if (!asset) return undefined;
  const responsiveImageSource: ImageResponsiveSource = { src: asset.url, srcSet: '' };
  if (!asset.formats) {
    return responsiveImageSource;
  }
  for (const format in asset.formats) {
    const formatSrc = asset.formats[format].url;
    if (!formatSrc) continue;
    responsiveImageSource.srcSet += `, ${formatSrc} ${asset.formats[format].width}w`;
  }
  return responsiveImageSource;
};
