import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { map, takeUntil } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';
import { ZsMapDisplayMode, ZsMapDrawElementState } from 'src/app/state/interfaces';
import { combineLatest, Subject } from 'rxjs';
import { I18NService } from 'src/app/state/i18n.service';
import capitalizeFirstLetter from 'src/app/helper/capitalizeFirstLetter';
import { Sign, signCategories, SignCategory } from 'src/app/core/entity/sign';
import { ZsMapStateService } from 'src/app/state/state.service';
import { ZsMapBaseDrawElement } from 'src/app/map-renderer/elements/base/base-draw-element';
import { FeatureLike } from 'ol/Feature';

@Component({
  selector: 'app-sidebar-filters',
  templateUrl: './sidebar-filters.component.html',
  styleUrls: ['./sidebar-filters.component.css'],
})
export class SidebarFiltersComponent implements OnInit, OnDestroy {
  filterSymbols: any[] = [];
  historyMode$: Observable<boolean>;
  filterKeys: any[] = [];
  hiddenSymbols$: Observable<number[]>;
  hiddenFeatureTypes$: Observable<string[]>;
  hiddenCategories$: Observable<string[]>;

  filtersOpenState = false;
  filtersGeneralOpenState = false;
  signCategories: SignCategory[] = [...signCategories.values()];
  capitalizeFirstLetter = capitalizeFirstLetter;
  private _ngUnsubscribe = new Subject<void>();

  constructor(public i18n: I18NService, private mapState: ZsMapStateService) {
    this.historyMode$ = this.mapState.observeDisplayState().pipe(
      takeUntil(this._ngUnsubscribe),
      map((state) => state.displayMode === ZsMapDisplayMode.HISTORY),
    );
    this.hiddenSymbols$ = this.mapState.observeHiddenSymbols();
    this.hiddenFeatureTypes$ = this.mapState.observeHiddenFeatureTypes();
    this.hiddenCategories$ = this.mapState.observeHiddenCategories();
  }

  ngOnInit(): void {
    combineLatest([
      this.mapState.observeDrawElements(),
      this.mapState.observeHiddenSymbols(),
      this.mapState.observeHiddenFeatureTypes(),
      this.mapState.observeHiddenCategories(),
    ])
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(([drawElements, hiddenSymbols, hiddenFeatureTypes, hiddenCategories]) => {
        this.updateFilterSymbolsAndFeatureTypes(drawElements, hiddenSymbols, hiddenFeatureTypes, hiddenCategories);
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  updateFilterSymbolsAndFeatureTypes(
    elements: ZsMapBaseDrawElement<ZsMapDrawElementState>[],
    hiddenSymbols: number[],
    hiddenFeatureTypes: string[],
    hiddenCategories: string[],
  ) {
    const symbols = {};
    if (elements && elements.length > 0) {
      elements.forEach((element) => this.extractSymbol(element.getOlFeature(), symbols));
    }
    this.filterKeys = Object.keys(symbols);
    this.filterSymbols = Object.values(symbols)
      .sort((a: any, b: any) => a.label.localeCompare(b.label))
      .map((symbol: any) => ({ ...symbol, hidden: hiddenSymbols.includes(symbol.id) || hiddenFeatureTypes.includes(symbol.filterValue) }));
    this.signCategories.forEach((category) => {
      category.isHidden = hiddenCategories?.includes(category.name);
    });
  }

  extractSymbol(f: FeatureLike, symbols: Record<string, any>) {
    const sig = f.get('sig');
    if (sig) {
      if (sig.src) {
        if (!symbols[sig.src]) {
          const dataUrl = null; //CustomImageStoreService.getImageDataUrl(sig.src);
          symbols[sig.src] = {
            label: this.i18n.getLabelForSign(sig),
            origSrc: sig.src,
            src: dataUrl ? dataUrl : 'assets/img/signs/' + sig.src,
            kat: sig.kat,
            id: sig.id,
          };
        }
      } else if (sig.type === undefined && f?.getGeometry()?.getType() === 'Polygon' && !sig.src) {
        symbols['not_labeled_polygon'] = {
          type: 'Polygon',
          label: this.i18n.get('polygon'),
          filterValue: 'not_labeled_polygon',
          icon: 'widgets',
        };
      } else if (sig.type === undefined && f?.getGeometry()?.getType() === 'LineString' && sig.text) {
        symbols['text_element'] = {
          type: 'LineString',
          label: this.i18n.get('text'),
          filterValue: 'text_element',
          icon: 'font_download',
        };
      } else if (sig.type === undefined && f?.getGeometry()?.getType() === 'LineString' && sig.freehand) {
        symbols['free_hand_element'] = {
          type: 'LineString',
          label: this.i18n.get('freeHand'),
          filterValue: 'free_hand_element',
          icon: 'gesture',
        };
      } else if (sig.type === undefined && f?.getGeometry()?.getType() === 'LineString' && !sig.src) {
        symbols['not_labeled_line'] = {
          type: 'LineString',
          label: this.i18n.get('line'),
          filterValue: 'not_labeled_line',
          icon: 'show_chart',
        };
      }
    }
  }

  public filterAll(active: boolean) {
    this.mapState.filterAll(
      active,
      this.filterSymbols.map((symbol) => symbol.filterValue),
      signCategories.map((category) => category.name),
    );
  }

  public toggleSymbolOrFeatureFilter(symbol: Sign) {
    if (symbol.type === '' || symbol.type === undefined) {
      this.mapState.toggleSymbol(symbol.id);
    } else {
      if (symbol.filterValue !== '' || symbol.filterValue !== undefined) this.mapState.toggleFeatureType(symbol.filterValue as string);
    }
  }

  public toggleCategoryFilter(category: SignCategory) {
    if (category.name !== '' && category.name !== undefined) {
      this.mapState.toggleCategory(category.name);
    }
  }
}
