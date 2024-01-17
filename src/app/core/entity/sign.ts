import { Coordinate } from 'ol/coordinate';
import { FeatureLike } from 'ol/Feature';
import { LineString, MultiPolygon, Point, Polygon } from 'ol/geom';

export interface FillStyle {
  name: string;
  size?: number;
  angle?: number;
  spacing?: number;
}

export interface Sign {
  id?: number;
  type: string;
  src: string;
  kat?: string;
  size?: string;
  protected?: boolean;
  de?: string;
  fr?: string;
  en?: string;
  text?: string;
  label?: string;
  labelShow?: boolean;
  fontSize?: number;
  style?: string;
  fillStyle?: FillStyle;
  example?: string;
  fillOpacity?: number;
  color?: string;
  strokeWidth?: number;
  hideIcon?: boolean;
  iconOffset?: number;
  flipIcon?: boolean;
  topCoord?: number[];
  onlyForSessionId?: string;
  description?: string;
  arrow?: string;
  iconSize?: number;
  images?: string[];
  iconOpacity?: number;
  rotation?: number;
  filterValue?: string;
  origSrc?: string;
  createdAt?: Date;
  reportNumber?: number;
}

export function isMoreOptimalIconCoordinate(
  coordinateToTest: Coordinate | Coordinate[],
  currentCoordinate: Coordinate | Coordinate[] | undefined | null,
) {
  if (currentCoordinate === undefined || currentCoordinate === null) {
    return true;
  } else if (coordinateToTest[1] > currentCoordinate[1]) {
    return true;
  } else if (coordinateToTest[1] === currentCoordinate[1]) {
    return coordinateToTest[0] < currentCoordinate[0];
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFirstCoordinate(feature: FeatureLike): any {
  switch (feature?.getGeometry()?.getType()) {
    case 'Polygon':
    case 'MultiPolygon':
      return (feature?.getGeometry() as MultiPolygon)?.getCoordinates()[0][0];
    case 'LineString':
      return (feature?.getGeometry() as LineString)?.getCoordinates()[0];
    case 'Point':
      return (feature?.getGeometry() as Point)?.getCoordinates();
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLastCoordinate(feature: FeatureLike): any {
  switch (feature?.getGeometry()?.getType()) {
    case 'Polygon':
    case 'MultiPolygon':
      const pCoordinates = (feature?.getGeometry() as Polygon)?.getCoordinates();
      return pCoordinates[pCoordinates.length - 2][0]; // -2 because the last coordinates are the same as the first
    case 'LineString':
      const lCoordinates = (feature?.getGeometry() as LineString)?.getCoordinates();
      return lCoordinates[lCoordinates.length - 1];
    case 'Point':
      return (feature?.getGeometry() as Point)?.getCoordinates();
  }

  return [];
}

export function getMostTopCoordinate(feature: FeatureLike) {
  let symbolAnchorCoordinate: Coordinate | null = null;
  switch (feature?.getGeometry()?.getType()) {
    case 'Polygon':
    case 'MultiPolygon':
      for (const coordinateGroup of (feature.getGeometry() as Polygon).getCoordinates()) {
        for (const coordinate of coordinateGroup) {
          if (isMoreOptimalIconCoordinate(coordinate, symbolAnchorCoordinate)) {
            symbolAnchorCoordinate = coordinate;
          }
        }
      }
      break;
    case 'LineString':
      for (const coordinate of (feature.getGeometry() as LineString).getCoordinates()) {
        if (isMoreOptimalIconCoordinate(coordinate, symbolAnchorCoordinate)) {
          symbolAnchorCoordinate = coordinate;
        }
      }
      break;
    case 'Point':
      symbolAnchorCoordinate = (feature.getGeometry() as Point).getCoordinates();
      break;
  }
  return symbolAnchorCoordinate;
}

export const signCategories: SignCategory[] = [
  { name: 'place', color: '#0000FF' },
  { name: 'formation', color: '#0000FF' },
  { name: 'action', color: '#0000FF' },
  { name: 'damage', color: '#FF0000' },
  { name: 'incident', color: '#FF0000' },
  { name: 'danger', color: '#FF9100' },
  // { name: 'fks', color: '#948B68' },
  { name: 'effect', color: '#FFF333' },
];

export interface SignCategory {
  name: string;
  color: string;
}

export function getColorForCategory(category: string): string {
  const foundCategory = signCategories.find((c) => c.name === category);
  return foundCategory ? foundCategory.color : '#535353';
}

export function defineDefaultValuesForSignature(signature: Sign) {
  signature.style = signature.style || signatureDefaultValues.style;
  signature.size = signature.size || signatureDefaultValues.size;
  signature.color = signature.color || signatureDefaultValues.color(signature.kat);
  signature.fillOpacity = signature.fillOpacity || signatureDefaultValues.fillOpacity;
  signature.strokeWidth = signature.strokeWidth || signatureDefaultValues.strokeWidth;
  signature.fontSize = signature.fontSize || signatureDefaultValues.fontSize;
  signature.fillStyle = signature.fillStyle || signatureDefaultValues.fillStyle;
  signature.fillStyle.angle = signature.fillStyle.angle || signatureDefaultValues.fillStyleAngle;
  signature.fillStyle.size = signature.fillStyle.size || signatureDefaultValues.fillStyleSize;
  signature.fillStyle.spacing = signature.fillStyle.spacing || signatureDefaultValues.fillStyleSpacing;
  signature.iconOffset = signature.iconOffset || signatureDefaultValues.iconOffset;
  signature.protected = signature.protected || signatureDefaultValues.protected;
  signature.labelShow = signature.labelShow || signatureDefaultValues.labelShow;
  signature.arrow = signature.arrow || signatureDefaultValues.arrow;
  signature.iconSize = signature.iconSize || signatureDefaultValues.iconSize;
  signature.iconOpacity = signature.iconOpacity || signatureDefaultValues.iconOpacity;
  signature.rotation = signature.rotation || signatureDefaultValues.rotation;
  signature.images = signature.images || signatureDefaultValues.images;
  signature.flipIcon = signature.flipIcon || signatureDefaultValues.flipIcon;
}

export const signatureDefaultValues: SignatureDefaultValues = {
  style: 'solid',
  size: undefined,
  color: (kat?: string): string => {
    if (kat) {
      return getColorForCategory(kat);
    } else {
      return '#535353';
    }
  },
  fillOpacity: 0.2,
  strokeWidth: 1,
  fontSize: 1,
  fillStyle: {
    name: 'filled',
  },
  fillStyleAngle: 45,
  fillStyleSize: 5,
  fillStyleSpacing: 10,
  iconOffset: 0.1,
  protected: false,
  labelShow: true,
  arrow: 'none',
  iconSize: 1,
  iconOpacity: 0.5,
  rotation: 1,
  images: [],
  flipIcon: false,
  hideIcon: false,
};

export interface SignatureDefaultValues {
  style: string;
  size?: string;
  color: (kat?: string) => string;
  fillOpacity: number;
  strokeWidth: number;
  fontSize: number;
  fillStyle: FillStyle;
  fillStyleAngle: number;
  fillStyleSize: number;
  fillStyleSpacing: number;
  iconOffset: number;
  protected: boolean;
  labelShow: boolean;
  arrow: string;
  iconSize: number;
  iconOpacity: number;
  rotation: number;
  images: string[];
  flipIcon: boolean;
  hideIcon: boolean;
}
