import { ZsMapStateSource } from './interfaces';
import OlTileXYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';

export class ZsMapSources {
  static get(source: ZsMapStateSource): OlTileXYZ {
    switch (source) {
      case ZsMapStateSource.GEO_ADMIN_SWISS_IMAGE:
        return new OlTileXYZ({
          attributions: [
            '<a target="new" href="https://www.swisstopo.admin.ch/' +
              'internet/swisstopo/en/home.html">swisstopo</a>',
          ],
          url: 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
        });
      case ZsMapStateSource.GEO_ADMIN_PIXEL:
        return new OlTileXYZ({
          attributions: [
            '<a target="new" href="https://www.swisstopo.admin.ch/' +
              'internet/swisstopo/en/home.html">swisstopo</a>',
          ],
          url: 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg',
        });
      case ZsMapStateSource.GEO_ADMIN_PIXEL_BW:
        return new OlTileXYZ({
          attributions: [
            '<a target="new" href="https://www.swisstopo.admin.ch/' +
              'internet/swisstopo/en/home.html">swisstopo</a>',
          ],
          url: 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg',
        });
      case ZsMapStateSource.OPEN_STREET_MAP:
      case undefined:
        return new OlTileXYZ({
          url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        });
      default:
        console.error(`Map source ${source} is not implemented`);
        return new OlTileXYZ({
          url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        });
    }
  }
}
