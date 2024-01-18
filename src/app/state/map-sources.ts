import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from './interfaces';
import OlTileXYZ from 'ol/source/XYZ';
import { PMTilesVectorSource } from 'ol-pmtiles';
import OlTileLayer from '../map-renderer/utils';
import VectorTile from 'ol/layer/VectorTile';
import { Layer } from 'ol/layer';
import { stylefunction } from 'ol-mapbox-style';
import { db } from '../db/db';

export class ZsMapSources {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getOlTileLayer(source: any) {
    return new OlTileLayer({
      zIndex: 0,
      source,
    });
  }

  static async get(source: ZsMapStateSource): Promise<Layer> {
    switch (source) {
      case ZsMapStateSource.GEO_ADMIN_SWISS_IMAGE:
        return ZsMapSources.getOlTileLayer(
          new OlTileXYZ({
            attributions: ['<a target="new" href="https://www.swisstopo.admin.ch/internet/swisstopo/en/home.html">swisstopo</a>'],
            url: 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
          }),
        );
      case ZsMapStateSource.GEO_ADMIN_PIXEL:
        return ZsMapSources.getOlTileLayer(
          new OlTileXYZ({
            attributions: ['<a target="new" href="https://www.swisstopo.admin.ch/internet/swisstopo/en/home.html">swisstopo</a>'],
            url: 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg',
          }),
        );
      case ZsMapStateSource.GEO_ADMIN_PIXEL_BW:
        return ZsMapSources.getOlTileLayer(
          new OlTileXYZ({
            attributions: ['<a target="new" href="https://www.swisstopo.admin.ch/internet/swisstopo/en/home.html">swisstopo</a>'],
            url: 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg',
          }),
        );
      case ZsMapStateSource.LOCAL: {
        const blobMeta = await db.blobMeta.where('map').equals(source).first();
        let mapUrl: string = zsMapStateSourceToDownloadUrl[source];
        let mapStyle: string | undefined = blobMeta?.mapStyle;
        if (blobMeta && blobMeta.blobStorageId) {
          if (blobMeta.objectUrl) {
            URL.revokeObjectURL(blobMeta.objectUrl);
            blobMeta.objectUrl = undefined;
          }
          const blob = await db.blobs.get(blobMeta.blobStorageId);
          if (blob) {
            mapUrl = URL.createObjectURL(blob);
            blobMeta.objectUrl = mapUrl;
          }
          await db.blobMeta.put(blobMeta);
        }
        if (!mapStyle) {
          mapStyle = await fetch('/assets/map-style.json').then((res) => res.text());
          if (blobMeta) {
            blobMeta.mapStyle = mapStyle;
            await db.blobMeta.put(blobMeta);
          }
        }
        const layer = new VectorTile({
          declutter: true,
          source: new PMTilesVectorSource({
            url: mapUrl,
          }),
          style: null,
        });

        layer.setStyle(stylefunction(layer, mapStyle, 'protomaps'));

        return layer;
      }
      case ZsMapStateSource.OPEN_STREET_MAP:
      case undefined:
        return ZsMapSources.getOlTileLayer(
          new OlTileXYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          }),
        );
      default:
        console.error(`Map source ${source} is not implemented`);
        return ZsMapSources.getOlTileLayer(
          new OlTileXYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          }),
        );
    }
  }
}
