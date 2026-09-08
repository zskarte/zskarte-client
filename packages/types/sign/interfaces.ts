import { FeatureLike } from "ol/Feature";
import { Circle, LineString, MultiPolygon, Point, Polygon } from "ol/geom";
import { ResourceAssignment } from "../resource/interfaces";

export enum HierarchyLevel {
  TRUPP = 'trupp',
  GRUPPE = 'gruppe',
  ZUG = 'zug',
  KOMPANIE = 'kompanie',
  BATAILLON = 'bataillon',
}

export interface FillStyle {
  name: string;
  size?: number;
  angle?: number;
  spacing?: number;
}

export interface IconsOffset {
  x: number;
  y: number;
  endHasDifferentOffset: boolean;
  endX: number;
  endY: number;
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
  createdBy?: string;
  labelShow?: boolean;
  fontSize?: number;
  style?: string;
  fillStyle?: FillStyle;
  example?: string;
  fillOpacity?: number;
  color?: string;
  strokeWidth?: number;
  hideIcon?: boolean;
  iconsOffset?: IconsOffset;
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
  affectedPersons?: number;
  hazardCode?: string;
  unNumber?: string;
  deprecated?: boolean;
  // Formation signature fields
  hierarchyLevel?: HierarchyLevel;
  organization?: string; // Text inside the circle (P, FW, San, ZS, A, etc.)
  formationDetail?: string; // Left text (Ustü, Lösch, Rttg, OD, etc.)
  additionalInfo?: string; // Right text (2 Z, 3 Gr, etc.)
  formationNumber?: string; // Bottom number
  formationLocation?: string; // Bottom location name

  // Resource catalogue (Mittelübersicht)
  resourceItems?: ResourceAssignment[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFirstCoordinate(feature: FeatureLike): any {
  switch (feature?.getGeometry()?.getType()) {
    case "Polygon":
    case "MultiPolygon":
      return (feature?.getGeometry() as MultiPolygon)?.getCoordinates()[0][0];
    case "LineString":
      return (feature?.getGeometry() as LineString)?.getCoordinates()[0];
    case "Point":
      return (feature?.getGeometry() as Point)?.getCoordinates();
    case "Circle":
      return (feature?.getGeometry() as Circle)?.getCenter();
    default:
      return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLastCoordinate(feature: FeatureLike): any {
  switch (feature?.getGeometry()?.getType()) {
    case "Polygon":
    case "MultiPolygon": {
      const pCoordinates = (
        feature?.getGeometry() as Polygon
      )?.getCoordinates();
      return pCoordinates[pCoordinates.length - 2][0]; // -2 because the last coordinates are the same as the first
    }
    case "LineString": {
      const lCoordinates = (
        feature?.getGeometry() as LineString
      )?.getCoordinates();
      return lCoordinates[lCoordinates.length - 1];
    }
    case "Point":
      return (feature?.getGeometry() as Point)?.getCoordinates();
    case "Circle":
      return (feature?.getGeometry() as Circle)?.getCenter();
    default:
      return [];
  }
}

export const signCategories: SignCategory[] = [
  { name: "place", color: "#0000FF" },
  { name: "formation", color: "#0000FF" },
  { name: "action", color: "#0000FF" },
  { name: "damage", color: "#FF0000" },
  { name: "danger", color: "#FF9100" },
  { name: "effect", color: "#FFF333" },
];

export interface SignCategory {
  name: string;
  color: string;
}

export function getColorForCategory(category: string): string {
  const foundCategory = signCategories.find((c) => c.name === category);
  return foundCategory ? foundCategory.color : "#535353";
}

export const signatureDefaultValues: SignatureDefaultValues = {
  style: "solid",
  size: undefined,
  color: (kat?: string): string => {
    if (kat) {
      return getColorForCategory(kat);
    } else {
      return "#535353";
    }
  },
  fillOpacity: 0.2,
  strokeWidth: 1,
  fontSize: 1,
  fillStyle: {
    name: "filled",
  },
  iconsOffset: {
    x: 0.1,
    y: 0.1,
    endHasDifferentOffset: false,
    endX: 0.1,
    endY: 0.1,
  },
  fillStyleAngle: 45,
  fillStyleSize: 5,
  fillStyleSpacing: 10,
  protected: false,
  labelShow: true,
  arrow: "none",
  iconSize: 1,
  iconOpacity: 0.5,
  rotation: 1,
  images: [],
  hideIcon: false,
  affectedPersons: undefined,
  hazardCode: undefined,
  unNumber: undefined,
  hierarchyLevel: undefined,
  organization: undefined,
  formationDetail: undefined,
  additionalInfo: undefined,
  formationNumber: undefined,
  formationLocation: undefined,
};

export function defineDefaultValuesForSignature(signature: Sign) {
  signature.style = signature.style ?? signatureDefaultValues.style;
  signature.size = signature.size ?? signatureDefaultValues.size;
  signature.color =
    signature.color ?? signatureDefaultValues.color(signature.kat);
  signature.fillOpacity =
    signature.fillOpacity ?? signatureDefaultValues.fillOpacity;
  signature.strokeWidth =
    signature.strokeWidth ?? signatureDefaultValues.strokeWidth;
  signature.fontSize = signature.fontSize ?? signatureDefaultValues.fontSize;
  signature.fillStyle = signature.fillStyle ?? { ...signatureDefaultValues.fillStyle };
  signature.fillStyle.angle =
    signature.fillStyle.angle ?? signatureDefaultValues.fillStyleAngle;
  signature.fillStyle.size =
    signature.fillStyle.size ?? signatureDefaultValues.fillStyleSize;
  signature.fillStyle.spacing =
    signature.fillStyle.spacing ?? signatureDefaultValues.fillStyleSpacing;
  const iconsOffset = { ...signatureDefaultValues.iconsOffset };
  iconsOffset.x = signature.iconsOffset?.x ?? signatureDefaultValues.iconsOffset.x;
  iconsOffset.y = signature.iconsOffset?.y ?? signatureDefaultValues.iconsOffset.y;
  iconsOffset.endHasDifferentOffset = signature.iconsOffset?.endHasDifferentOffset ?? signatureDefaultValues.iconsOffset.endHasDifferentOffset;
  iconsOffset.endX = signature.iconsOffset?.endX ?? signatureDefaultValues.iconsOffset.endX;
  iconsOffset.endY = signature.iconsOffset?.endY ?? signatureDefaultValues.iconsOffset.endY;
  signature.iconsOffset = iconsOffset;
  signature.protected = signature.protected ?? signatureDefaultValues.protected;
  signature.labelShow = signature.labelShow ?? signatureDefaultValues.labelShow;
  signature.arrow = signature.arrow ?? signatureDefaultValues.arrow;
  signature.iconSize = signature.iconSize ?? signatureDefaultValues.iconSize;
  signature.iconOpacity =
    signature.iconOpacity ?? signatureDefaultValues.iconOpacity;
  signature.rotation = signature.rotation ?? signatureDefaultValues.rotation;
  signature.images = signature.images ?? signatureDefaultValues.images;
  signature.affectedPersons =
    signature.affectedPersons ?? signatureDefaultValues.affectedPersons;
  signature.hazardCode =
    signature.hazardCode ?? signatureDefaultValues.hazardCode;
  signature.unNumber =
    signature.unNumber ?? signatureDefaultValues.unNumber;
}

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
  iconsOffset: IconsOffset;
  protected: boolean;
  labelShow: boolean;
  arrow: string;
  iconSize: number;
  iconOpacity: number;
  rotation: number;
  images: string[];
  hideIcon: boolean;
  affectedPersons: number | undefined;
  hazardCode: string | undefined;
  unNumber: string | undefined;
  hierarchyLevel: string | undefined;
  organization: string | undefined;
  formationDetail: string | undefined;
  additionalInfo: string | undefined;
  formationNumber: string | undefined;
  formationLocation: string | undefined;
}
