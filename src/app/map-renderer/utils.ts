import CPUTileLayer from 'ol/layer/Tile';
import GPUTileLayer from 'ol/layer/WebGLTile';
import TileWMTS from 'ol/source/WMTS';
import { Subject } from 'rxjs';

export type RenderStrategy = 'webgl' | 'default';

export const renderStrategy$ = new Subject<RenderStrategy>();

function isWebGLSupported(): boolean {
  return false;
}

export type OlTileLayerType = typeof CPUTileLayer<TileWMTS> | typeof GPUTileLayer;

function getOlTileLayer(): OlTileLayerType {
  if (isWebGLSupported()) {
    console.info('Using WebGL Tile Layer');
    renderStrategy$.next('webgl');
    return GPUTileLayer;
  } else {
    console.info('Using Fallback Tile Layer');
    renderStrategy$.next('default');
    return CPUTileLayer<TileWMTS>;
  }
}

export const OlTileLayer: OlTileLayerType = getOlTileLayer();

export default OlTileLayer;
