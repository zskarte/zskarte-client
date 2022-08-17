import { Geometry } from 'ol/geom';
import { getLength, getArea } from 'ol/sphere';

export const checkCoordinates = (
  c1: undefined | null | number | number[] | number[][] | any[],
  c2: undefined | null | number | number[] | number[][] | any[],
): boolean => {
  if (!c1 || !c2) {
    return false;
  }
  if (Array.isArray(c1) && Array.isArray(c2)) {
    if (c1.length !== c2.length) {
      return false;
    }
    if (c1.length === 0 || c2.length === 0) {
      return false;
    }
    for (let i = 0; i < c1.length; i++) {
      if (Array.isArray(c1[i]) && Array.isArray(c2[i])) {
        if (!checkCoordinates(c1[i], c2[i])) {
          return false;
        }
      }
      if (c1 !== c2) {
        return false;
      }
    }
  } else {
    if (c1 !== c2) {
      return false;
    }
  }

  return true;
};

export function formatLength(line: Geometry) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100 + ' ' + 'm';
  }
  return output;
}

export function formatArea(polygon: Geometry) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  } else {
    output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
  }
  return output;
}
