import { IZsMapState } from '../../state/interfaces';

export enum OperationExportFileVersion {
  V1 = 'V1',
  V2 = 'V2',
}

// If you adjust this file you need to adjust the import as well
export interface OperationExportFile {
  name: string;
  description: string;
  version: OperationExportFileVersion;
  map: IZsMapState;
}
