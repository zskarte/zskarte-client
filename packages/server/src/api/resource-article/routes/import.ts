import { CreateAccessControlMiddlewareConfig } from '../../../middlewares/AccessControlMiddlewareConfig';
import { AccessControlTypes } from '../../../definitions';

export default {
  routes: [
    {
      method: 'POST',
      path: '/resource-articles/import',
      handler: 'resource-article.import',
      config: {
        middlewares: [
          CreateAccessControlMiddlewareConfig({ type: 'api::resource-article.resource-article', check: AccessControlTypes.CREATE }),
        ],
      },
    },
  ],
};
