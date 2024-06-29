import { ZsMapStateSource, zsMapStateSourceToDownloadUrl } from './interfaces';
import OlTileXYZ from 'ol/source/XYZ';
import { PMTilesVectorSource } from 'ol-pmtiles';
import OlTileLayer from '../map-renderer/utils';
import VectorTile from 'ol/layer/VectorTile';
import { Layer } from 'ol/layer';
import { stylefunction } from 'ol-mapbox-style';
import { db } from '../db/db';
import { BlobService } from '../db/blob.service';
import { LOCAL_MAP_STYLE_PATH, LOCAL_MAP_STYLE_SOURCE } from '../session/default-map-values';

export const ZsMapSources = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOlTileLayer(source: any) {
    return new OlTileLayer({
      zIndex: 0,
      source,
    });
  },
  async get(source: ZsMapStateSource): Promise<Layer> {
    switch (source) {
      case ZsMapStateSource.GEO_ADMIN_SWISS_IMAGE:
        return this.getOlTileLayer(
          new OlTileXYZ({
            attributions: ['<a target="new" href="https://www.swisstopo.admin.ch/internet/swisstopo/en/home.html">swisstopo</a>'],
            url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
            maxZoom: 20,
          }),
        );
      case ZsMapStateSource.GEO_ADMIN_PIXEL:
        return this.getOlTileLayer(
          new OlTileXYZ({
            attributions: ['<a target="new" href="https://www.swisstopo.admin.ch/internet/swisstopo/en/home.html">swisstopo</a>'],
            url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg',
            maxZoom: 19,
          }),
        );
      case ZsMapStateSource.GEO_ADMIN_PIXEL_BW:
        return this.getOlTileLayer(
          new OlTileXYZ({
            attributions: ['<a target="new" href="https://www.swisstopo.admin.ch/internet/swisstopo/en/home.html">swisstopo</a>'],
            url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg',
            maxZoom: 19,
          }),
        );
      case ZsMapStateSource.LOCAL: {
        const downloadUrl = zsMapStateSourceToDownloadUrl[source];
        const mapMeta = await db.localMapInfo.get(source);
        const mapUrl = await BlobService.getBlobOrRealUrl(downloadUrl, mapMeta?.mapBlobId);
        const styleUrl = await BlobService.getBlobOrRealUrl(LOCAL_MAP_STYLE_PATH, mapMeta?.styleBlobId);
        const mapStyle = await fetch(styleUrl).then((res) => res.text());
        const layer = new VectorTile({
          declutter: true,
          source: new PMTilesVectorSource({
            url: mapUrl,
          }),
          style: null,
        });

        layer.setStyle(stylefunction(layer, mapStyle, mapMeta?.styleSourceName ?? LOCAL_MAP_STYLE_SOURCE));

        return layer;
      }
      case ZsMapStateSource.NONE:
        return new OlTileLayer({
          zIndex: 0,
        });
      case ZsMapStateSource.OPEN_STREET_MAP:
      case undefined:
        return this.getOlTileLayer(
          new OlTileXYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 19,
          }),
        );
      default:
        console.error(`Map source ${source} is not implemented`);
        return this.getOlTileLayer(
          new OlTileXYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 19,
          }),
        );
    }
  },
};
