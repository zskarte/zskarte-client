import { DatePipe } from '@angular/common';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { I18NService } from '../state/i18n.service';
import capitalizeFirstLetter from './capitalizeFirstLetter';
import { getCenter } from 'ol/extent';
import { availableProjections } from './projections';
import saveAs from 'file-saver';
import { Workbook } from 'exceljs';

export function mapProtocolEntry(
  elements: ZsMapBaseDrawElement[],
  datePipe: DatePipe,
  i18n: I18NService,
  currentLocale: string,
): ProtocolEntry[] {
  return elements.map((element) => {
    const olFeature = element.getOlFeature();
    const sig = olFeature.get('sig');
    const sk: string = sig.kat ? 'sign' + capitalizeFirstLetter(sig.kat) : 'csvGroupArea';
    const geometry = element.getOlFeature().getGeometry();
    const extent = geometry?.getExtent();
    const centroid = availableProjections[0].translate(extent ? getCenter(extent) : []);
    return {
      id: element.getId(),
      date: datePipe.transform(element.elementState?.createdAt, 'dd.MM.yyyy HH:mm'),
      group: sk && i18n.has(sk) ? i18n.get(sk) : '',
      sign: currentLocale == 'fr' ? sig.fr : currentLocale == 'en' ? sig.en : sig.de,
      location: JSON.stringify((geometry as any).getCoordinates() || []),
      centroid: centroid,
      size: sig.size,

      // if the element is of type text,
      // the name attribute does not exist.
      // However, the "name" is stored inside the "text" attribute
      label: element.elementState?.name || (element.elementState as any)?.text,
      description: element.elementState?.description,
    } as ProtocolEntry;
  });
}

export interface ProtocolEntry {
  id: string;
  date?: string;
  group: string;
  sign: string;
  location: string;
  centroid: string;
  size: string;
  label: string;
  description: string;
}

export function exportProtocolExcel(protocolEntries: ProtocolEntry[]) {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Protocol Entries');
  sheet.columns = [
    { header: 'Datum', key: 'date', width: 15 },
    { header: 'Gruppe', key: 'group', width: 15 },
    { header: 'Signatur', key: 'sign', width: 15 },
    { header: 'Koordinaten', key: 'location', width: 30 },
    { header: 'Bezeichnung', key: 'label', width: 15 },
    { header: 'Beschreibung', key: 'description', width: 30 },
  ];
  sheet.addRows(protocolEntries);
  return workbook.xlsx.writeBuffer().then((buffer: BlobPart) => {
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `Protokollexport_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}
