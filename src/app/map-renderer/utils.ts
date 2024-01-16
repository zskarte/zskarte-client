import CPUTileLayer from 'ol/layer/Tile';
import GPUTileLayer from 'ol/layer/WebGLTile';
import TileWMTS from 'ol/source/WMTS';
import { Subject } from 'rxjs';

export type RenderStrategy = 'webgl' | 'default';

export const renderStrategy$ = new Subject<RenderStrategy>();

function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(Boolean(window.WebGLRenderingContext) && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
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
