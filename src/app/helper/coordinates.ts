export const checkCoordinates = (
  c1: undefined | number | number[] | number[][],
  c2: undefined | number | number[] | number[][],
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
