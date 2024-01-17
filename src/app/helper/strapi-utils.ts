import { IZsStrapiAsset } from '../session/operations/operation.interfaces';

interface ImageResponsiveSource {
  src: string;
  srcSet: string;
}

export type StrapiApiResponseList<T> = {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

export const getResponsiveImageSource = (asset: IZsStrapiAsset) => {
  if (!asset) return undefined;
  const responsiveImageSource: ImageResponsiveSource = { src: asset.url, srcSet: '' };
  if (asset.formats) {
    responsiveImageSource.srcSet = Object.keys(asset.formats)
      .map((key) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const format = asset.formats![key];
        return format.url ? `${format.url} ${format.width}w` : '';
      })
      .filter((src) => Boolean(src))
      .join(', ');
  }
  return responsiveImageSource;
};
