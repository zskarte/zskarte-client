/**
 * resource-article router
 */

import { factories } from '@strapi/strapi';
import { AccessControlMiddlewareRoutesConfig } from '../../../middlewares/AccessControlMiddlewareConfig';

export default factories.createCoreRouter(
  'api::resource-article.resource-article',
  AccessControlMiddlewareRoutesConfig({ type: 'api::resource-article.resource-article' }),
);
