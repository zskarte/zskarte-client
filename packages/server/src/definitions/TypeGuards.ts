import { Schema, UID, Utils, Struct } from '@strapi/strapi';

//Type analysing/Schema based on logic from UID
interface IsOperationTypeSchema extends Struct.CollectionTypeSchema {
  collectionName: 'operations';
}
interface IsOrganizationTypeSchema extends Struct.CollectionTypeSchema {
  collectionName: 'organizations';
}
interface HasOperationTypeSchema extends Struct.CollectionTypeSchema {
  attributes: {
    operation: Schema.Attribute.Relation<'oneToOne' | 'manyToOne', 'api::operation.operation'>;
  };
}

interface HasOrganizationTypeSchema extends Struct.CollectionTypeSchema {
  attributes: {
    organization: Schema.Attribute.Relation<'oneToOne' | 'manyToOne', 'api::organization.organization'>;
  };
}
interface HasPublicTypeSchema extends Struct.CollectionTypeSchema {
  attributes: {
    public: Schema.Attribute.Boolean;
  };
}

export type IsOperationType = Utils.Guard.Never<
  Extract<Utils.Object.KeysBy<Schema.ContentTypes, IsOperationTypeSchema>, UID.ContentType>,
  UID.ContentType
>;
export type IsOrganizationType = Utils.Guard.Never<
  Extract<Utils.Object.KeysBy<Schema.ContentTypes, IsOrganizationTypeSchema>, UID.ContentType>,
  UID.ContentType
>;
export type HasOperationType = Utils.Guard.Never<
  Extract<Utils.Object.KeysBy<Schema.ContentTypes, HasOperationTypeSchema>, UID.ContentType>,
  UID.ContentType
>;
export type HasOrganizationType = Utils.Guard.Never<
  Extract<Utils.Object.KeysBy<Schema.ContentTypes, HasOrganizationTypeSchema>, UID.ContentType>,
  UID.ContentType
>;
export type AccessCheckableType = IsOperationType | IsOrganizationType | HasOperationType | HasOrganizationType;
export type HasPublicType = Utils.Guard.Never<
  Extract<Utils.Object.KeysBy<Schema.ContentTypes, HasPublicTypeSchema>, UID.ContentType>,
  UID.ContentType
>;

//unfortunately as types are striped away on runtime we have to define them here explizite. But the type definitions above help the intellisense show all possible/valid values.
const IsOperationTypes: IsOperationType[] = ['api::operation.operation'];
const IsOrganizationTypes: IsOrganizationType[] = ['api::organization.organization'];
const HasOperationTypes: HasOperationType[] = [
  'api::access.access',
  'api::map-snapshot.map-snapshot',
  'api::journal-entry.journal-entry',
  'api::resource-article.resource-article',
];
const HasOrganizationTypes: HasOrganizationType[] = [
  'plugin::users-permissions.user',
  'api::operation.operation',
  'api::wms-source.wms-source',
  'api::map-layer.map-layer',
  'api::journal-entry.journal-entry',
  'api::resource-article.resource-article',
];
const AccessCheckableTypes: AccessCheckableType[] = [
  ...IsOperationTypes,
  ...IsOrganizationTypes,
  ...HasOperationTypes,
  ...HasOrganizationTypes,
];

const HasPublicTypes: HasPublicType[] = ['api::wms-source.wms-source', 'api::map-layer.map-layer'];

export const isOperation = (obj): obj is IsOperationType => IsOperationTypes.includes(obj);
export const isOrganization = (obj): obj is IsOrganizationType => IsOrganizationTypes.includes(obj);
export const hasOperation = (obj): obj is HasOperationType => HasOperationTypes.includes(obj);
export const hasOrganization = (obj): obj is HasOrganizationType => HasOrganizationTypes.includes(obj);
export const isAccessCheckable = (obj): obj is AccessCheckableType => AccessCheckableTypes.includes(obj);
export const hasPublic = (obj): obj is HasPublicType => HasPublicTypes.includes(obj);
