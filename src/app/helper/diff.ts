export function getPropertyDifferences<T extends object>(
  orig: T,
  changed: T,
  propToKeep?: (keyof T)[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subPropToKeep?: { [key: string]: any },
): Partial<T> {
  const keep = propToKeep?.map((p) => p.valueOf());
  const keys = [...new Set([...Object.keys(orig), ...Object.keys(changed)])];
  return keys.reduce((diff, key) => {
    // Check if the property does not exists in orig.
    if (!Object.prototype.hasOwnProperty.call(orig, key)) {
      // If it exist in changed add it
      if (Object.prototype.hasOwnProperty.call(changed, key)) {
        // prevent to add if value is "undefined" or it's boolean and value false
        if (changed[key] === undefined || (typeof changed[key] === 'boolean' && changed[key] === false)) {
          return diff;
        }
        return {
          ...diff,
          [key]: changed[key],
        };
      } else {
        return diff;
      }
    }
    const value = orig[key];
    // Check if the property exists in changed.
    if (Object.prototype.hasOwnProperty.call(changed, key)) {
      const val = changed[key];
      // Check if orig's property value is different from changed's.
      if (val !== value) {
        if (Array.isArray(val)) {
          // Array compare logic
          if (val.length === value.length) {
            const subDiff = getPropertyDifferences(value, val);
            if (Object.keys(subDiff).length > 0) {
              // if any diff add full changed array (no logic for removed handling)
              return {
                ...diff,
                [key]: val,
              };
            }
          } else {
            return {
              ...diff,
              [key]: val,
            };
          }
        } else if (typeof val === 'object' && typeof value === 'object') {
          // Object compare logic
          const subDiff = getPropertyDifferences(value, val, subPropToKeep ? subPropToKeep[key] : undefined);
          if (Object.keys(subDiff).length > 0) {
            return {
              ...diff,
              [key]: subDiff,
            };
          }
        } else {
          return {
            ...diff,
            [key]: val,
          };
        }
      }
    } else {
      // Property removed so add undefined, except if value is "undefined" or it's boolean and value false
      if (orig[key] !== undefined && (typeof orig[key] !== 'boolean' || orig[key] !== false)) {
        return {
          ...diff,
          [key]: undefined,
        };
      }
    }
    // keep same values if defined
    if (keep?.includes(key)) {
      return {
        ...diff,
        [key]: value,
      };
    }

    // Otherwise, just return the previous diff object.
    return diff;
  }, {});
}
