import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { I18NService } from '../../state/i18n.service';
import { MapLayer, WmsSource } from '../map-layer-interface';
import { MapLayerService } from '../map-layer.service';
import { IZsMapOrganization } from 'src/app/session/operations/operation.interfaces';
import { FormControl } from '@angular/forms';
import { Observable, combineLatest, map, startWith } from 'rxjs';
import { getPropertyDifferences } from 'src/app/helper/diff';

@Component({
  selector: 'app-organisation-layer-settings',
  templateUrl: './organisation-layer-settings.component.html',
  styleUrl: './organisation-layer-settings.component.scss',
})
export class OrganisationLayerSettingsComponent {
  wms_sources: number[];
  layer_favorites: MapLayer[];

  layerFilter = new FormControl('');
  sourceFilter = new FormControl('ALL');
  filteredAvailableLayers$: Observable<MapLayer[]>;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      organization: IZsMapOrganization;
      wmsSources: WmsSource[];
      globalMapLayers: MapLayer[];
      allLayers: MapLayer[];
      selectedLayers: MapLayer[];
      selectedSources: WmsSource[];
    },
    private dialogRef: MatDialogRef<OrganisationLayerSettingsComponent>,
    private _mapLayerService: MapLayerService,
    public i18n: I18NService,
  ) {
    this.wms_sources = [...data.organization.wms_sources];
    this.layer_favorites = data.allLayers.filter((f) => f.id && data.organization.map_layer_favorites.includes(f.id));

    const filter$ = this.layerFilter.valueChanges.pipe(startWith(''));
    const selectedSource$ = this.sourceFilter.valueChanges.pipe(startWith('ALL'));

    this.filteredAvailableLayers$ = combineLatest([filter$, selectedSource$]).pipe(
      map(([filter, source]) => {
        let layers = data.allLayers.sort((a: MapLayer, b: MapLayer) => a.label.localeCompare(b.label));
        if (source !== 'ALL') {
          if (source === '_GlobalMapLayers_') {
            layers = layers.filter((f) => f.id !== undefined);
          } else {
            const sourceFilter = source === '_GeoAdmin_' ? undefined : source;
            layers = layers.filter((f) => f.source?.url === sourceFilter);
          }
        }
        return filter === '' ? layers : layers.filter((f) => f.label.toLowerCase().includes(filter?.toLowerCase() ?? ''));
      }),
    );
  }

  toggleSource(item: WmsSource) {
    const id = item.id;
    if (id) {
      const index = this.wms_sources.indexOf(id);
      if (index !== -1) {
        this.wms_sources.splice(index, 1);
      } else {
        this.wms_sources.push(id);
      }
    }
  }

  selectCurrentSource() {
    this.wms_sources = this.data.selectedSources.map((s) => s.id ?? null).filter((id): id is number => Boolean(id));
  }

  removeLayer(layer: MapLayer) {
    const index = this.layer_favorites.indexOf(layer);
    if (index !== -1) {
      this.layer_favorites.splice(index, 1);
    }
  }

  addCurrentLayers() {
    this.data.selectedLayers.forEach((layer) => this.selectLayer(layer));
  }

  selectLayer(layer: MapLayer) {
    const index = this.layer_favorites.indexOf(layer);
    if (index === -1) {
      let existing = this.layer_favorites.find((f) => f.id === layer.id);
      if (!existing) {
        existing = this.layer_favorites.find((f) => f.fullId === layer.fullId);
      }
      if (existing && OrganisationLayerSettingsComponent.sameOptions(existing, layer)) {
        return;
      }
      this.layer_favorites.push(layer);
    }
  }

  changedOptions(layer: MapLayer) {
    const defaultLayer = this.data.allLayers.find((f) => f.fullId === layer.fullId);
    return !defaultLayer || !OrganisationLayerSettingsComponent.sameOptions(defaultLayer, layer);
  }

  static sameOptions(oldLayer: MapLayer, newLayer: MapLayer) {
    const diff = getPropertyDifferences(oldLayer, newLayer);
    delete diff.deleted;
    delete diff.zIndex;
    delete diff.fullId;
    delete diff.owner;
    return Object.keys(diff).length === 0;
  }

  async ok() {
    const map_layer_favorites: number[] = [];
    const errors: string[] = [];
    for (let i = 0; i < this.layer_favorites.length; i++) {
      const layer = { ...this.layer_favorites[i] };
      // check if matching entry in selectedLayers and the values are the same / it's relay added from there
      let selectedLayer = this.data.selectedLayers.find(
        (g) => g.fullId === layer.fullId && OrganisationLayerSettingsComponent.sameOptions(g, layer),
      );
      if (layer.id) {
        const defaultLayer = this.data.allLayers.find((g) => g.fullId === layer.fullId);
        if (defaultLayer) {
          if (OrganisationLayerSettingsComponent.sameOptions(defaultLayer, layer)) {
            // unchaged existing globalMapLayer, add it
            map_layer_favorites.push(layer.id);
            continue;
          } else {
            // layer settings are changed
            if (layer.owner) {
              // skipcq: JS-0052
              const override = window.confirm(this.i18n.get('askReplaceExistingLayerSettings').replace('{0}', layer.label));
              if (!override) {
                // keep old, create new
                delete layer.id;
              }
            } else {
              // not owner, create new
              layer.public = false;
              delete layer.id;
            }
          }
        } else {
          // unknown old values, create new
          delete layer.id;
        }
      }
      // for the new generated layer you'r the owner
      layer.owner = true;
      const savedLayer = await this._mapLayerService.saveGlobalMapLayer(layer, this.data.organization.id);
      if (savedLayer?.id) {
        this.layer_favorites[i] = savedLayer;
        // add new added layer
        map_layer_favorites.push(savedLayer.id);
        // if it was one of the selected one, update the changed values
        if (selectedLayer) {
          const index = this.data.selectedLayers.indexOf(selectedLayer);
          selectedLayer = {
            ...selectedLayer,
            id: savedLayer.id,
            fullId: savedLayer.fullId,
            owner: savedLayer.owner,
            public: savedLayer.public,
          };
          this.data.selectedLayers[index] = selectedLayer;
        }
      } else {
        errors.push(`Error on persist ${layer.label}`);
      }
    }
    if (errors.length > 0) {
      // skipcq: JS-0052
      alert(errors.join('\n'));
      return;
    }
    this.dialogRef.close({ wms_sources: this.wms_sources, map_layer_favorites });
  }
}
