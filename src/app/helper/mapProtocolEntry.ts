import { DatePipe } from '@angular/common';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { I18NService } from '../state/i18n.service';
import capitalizeFirstLetter from './capitalizeFirstLetter';

export function mapProtocolEntry(elements: ZsMapBaseDrawElement[], datePipe: DatePipe, i18n: I18NService): ProtocolEntry[] {
  return elements.map((element) => {
    const sig = element.getOlFeature().get('sig');
    const sk: string = sig.kat ? 'sign' + capitalizeFirstLetter(sig.kat) : 'csvGroupArea';
    return {
      id: element.getId(),
      date: datePipe.transform(element.elementState?.createdAt, 'dd.MM.yyyy HH:mm'),
      group: sk && i18n.has(sk) ? i18n.get(sk) : '', //TODO groups has no name atm
      sign: sig.de, // TODO translate
      location: JSON.stringify((element.getOlFeature().getGeometry() as any).getCoordinates()),
      size: sig.size,
      label: element.elementState?.name,
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
  size: string;
  label: string;
  description: string;
}
