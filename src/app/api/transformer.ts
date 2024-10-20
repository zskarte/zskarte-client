import { has, cloneDeep, isArray, isObject, head, forEach } from 'lodash';

export interface TransformerOptions {
  removeAttributesKey?: boolean;
  removeDataKey?: boolean;
  removeMeta?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeObjectKey = (object: any, key: string) => ({
  id: object.id,
  ...object[key],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformResponse = <T>(data: any, customOptions?: TransformerOptions): T => {
  const options: TransformerOptions = {
    removeAttributesKey: customOptions?.removeAttributesKey ?? true,
    removeDataKey: customOptions?.removeDataKey ?? true,
    removeMeta: customOptions?.removeMeta ?? true,
  };
  if (has(data, 'data') && has(data, 'meta')) {
    data = cloneDeep(data) as T;
    if (options.removeMeta) {
      data = data.data;
    }
  }
  // removeAttributeKey specific transformations
  if (options.removeAttributesKey) {
    // single
    if (has(data, 'attributes')) {
      return transformResponse(removeObjectKey(data, 'attributes'), customOptions);
    }

    // collection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (Array.isArray(data) && (data as any[]).length && has(head(data), 'attributes')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map?.((e) => transformResponse(e), customOptions) as T;
    }
  }

  // fields
  forEach(data, (value, key) => {
    if (!value) {
      return;
    }

    // removeDataKey specific transformations
    if (options.removeDataKey) {
      // single
      if (isObject(value)) {
        data[key] = transformResponse(value, customOptions);
      }

      // many
      if (isArray(value)) {
        data[key] = value.map((field) => transformResponse(field, customOptions));
      }
    }

    // relation(s)
    if (has(value, 'data')) {
      let relation = null;
      // single
      if (isObject(value.data)) {
        relation = transformResponse(value.data, customOptions);
      }

      // many
      if (isArray(value.data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        relation = value.data.map((e: any) => transformResponse(e, customOptions));
      }

      if (options.removeDataKey) {
        data[key] = relation;
      } else {
        data[key].data = relation;
      }
    }

    // single component
    if (has(value, 'id')) {
      data[key] = transformResponse(value, customOptions);
    }

    // repeatable component & dynamic zone
    if (isArray(value) && has(head(value), 'id')) {
      data[key] = value.map((p) => transformResponse(p, customOptions));
    }

    // single media
    if (has(value, 'provider')) {
      return;
    }

    // multi media
    if (isArray(value) && has(head(value), 'provider')) {
      return;
    }
  });

  return data;
};

export default transformResponse;
