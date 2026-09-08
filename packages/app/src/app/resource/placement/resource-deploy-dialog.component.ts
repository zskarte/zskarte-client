import { AfterViewInit, ChangeDetectorRef, Component, computed, inject, signal, viewChild, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getCenter } from 'ol/extent';
import { fromLonLat } from 'ol/proj';
import { IResultSet, IZsMapSearchResult, Sign } from '@zskarte/types';
import { DrawStyle } from '../../map-renderer/draw-style';
import { Signs } from '../../map-renderer/signs';
import { JournalEntry } from '../../journal/journal.types';
import { JournalService } from '../../journal/journal.service';
import { I18NService } from '../../state/i18n.service';
import { ZsMapStateService } from '../../state/state.service';
import { SearchService } from '../../search/search.service';
import { SearchAutocompleteComponent } from '../../search/search-autocomplete/search-autocomplete.component';
import { SelectSignDialog } from '../../select-sign-dialog/select-sign-dialog.component';
import { DialogHeaderComponent, DialogBodyComponent, DialogFooterComponent } from '../../ui/dialog-layout';
import { resolveCollectionSignId, resolveResourceSignId } from '../resource-signature.mapping';
import {
  ResourceDeployRequest,
  ResourceDeploySelection,
  ResourcePlacementService,
  countSingleModeMarkers,
} from './resource-placement.service';

export interface ResourceDeployDialogData {
  selections: ResourceDeploySelection[];
}

/** Rendered signature (pictogram) preview - reused for the selection list and the signature section. */
interface SignaturePreview {
  url: string;
  label: string;
  isPlaceholder: boolean;
}

const MANY_MARKERS_THRESHOLD = 50;

/**
 * Dialog for placing catalogue resources on the map: pick the resources (done before this
 * dialog opens), link them to a journal message, search an address/coordinate (or use the map
 * centre / a map click as alternatives) to place them, and optionally override how they're
 * drawn. Placing itself is delegated entirely to `ResourcePlacementService` - this component
 * never mutates map state directly.
 */
@Component({
  selector: 'app-resource-deploy-dialog',
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatTooltipModule,
    SearchAutocompleteComponent,
    DialogHeaderComponent,
    DialogBodyComponent,
    DialogFooterComponent,
  ],
  templateUrl: './resource-deploy-dialog.component.html',
  styleUrl: './resource-deploy-dialog.component.scss',
})
export class ResourceDeployDialogComponent implements AfterViewInit {
  private readonly data = inject<ResourceDeployDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ResourceDeployDialogComponent>>(MatDialogRef);
  private readonly dialog = inject(MatDialog);
  private readonly state = inject(ZsMapStateService);
  private readonly journal = inject(JournalService);
  private readonly search = inject(SearchService);
  private readonly placement = inject(ResourcePlacementService);
  private readonly cdr = inject(ChangeDetectorRef);
  i18n = inject(I18NService);

  readonly selections = this.data.selections;

  readonly mode = signal<'collection' | 'single'>('collection');
  readonly name = signal('');
  readonly symbolOverride = signal<number | undefined>(undefined);
  readonly messageNumber = signal<number | undefined>(undefined);

  // Address/coordinate search for the "Ort" step - wired to the very same
  // `SearchService.createGlobalSearchInstance(...)` the main map's `app-geocoder` uses, so
  // free-text addresses and raw coordinates both work here exactly as they do there.
  readonly locationSearchTerm = signal('');
  readonly locationResults = signal<IResultSet[]>([]);
  readonly pickedLocation = signal<IZsMapSearchResult | null>(null);
  private readonly locationAutocompleteTrigger = viewChild(MatAutocompleteTrigger);

  /**
   * The picked result's map (Web-Mercator) coordinate - `deploy()`'s placement point.
   *
   * Resolved asynchronously because not every search result carries a coordinate directly:
   * street results (e.g. "Pappelnweg, 4310 Rheinfelden") only come with a geometry `feature`,
   * and some results only reference one via `internal.origin`/`featureId` and must be fetched.
   * This mirrors the precedence in `SearchService.highlightResult()`.
   */
  readonly pickedCoordinates = signal<number[] | undefined>(undefined);

  readonly pickedLocationLabel = computed(() => this.pickedLocation()?.label.replace(/<[^>]*>/g, ''));

  readonly journalEntries = computed(() =>
    [...this.journal.data()].sort((a, b) => b.messageNumber - a.messageNumber),
  );
  readonly fromJournalHint = computed(() => {
    const activeEntry = this.journal.drawingEntry;
    return !!activeEntry && activeEntry.messageNumber === this.messageNumber();
  });

  readonly defaultCollectionSymbolId = computed(() =>
    resolveCollectionSignId(this.selections.map((selection) => selection.article)),
  );
  readonly effectiveSymbolId = computed(() => this.symbolOverride() ?? this.defaultCollectionSymbolId());
  readonly collectionSignature = computed(() => this.toPreview(this.effectiveSymbolId()));

  readonly singleSignatures = computed<SignaturePreview[]>(() => {
    const seen = new Set<number>();
    const previews: SignaturePreview[] = [];
    for (const selection of this.selections) {
      const symbolId = resolveResourceSignId(selection.article);
      if (seen.has(symbolId)) {
        continue;
      }
      seen.add(symbolId);
      previews.push(this.toPreview(symbolId));
    }
    return previews;
  });

  readonly markerCount = computed(() => (this.mode() === 'single' ? countSingleModeMarkers(this.selections) : 1));
  readonly manyMarkersWarning = computed(() => this.markerCount() > MANY_MARKERS_THRESHOLD);

  constructor() {
    const activeEntry = this.journal.drawingEntry;
    if (activeEntry) {
      this.messageNumber.set(activeEntry.messageNumber);
    }

    const searchConfig = this.state.getSearchConfig();
    const { searchResults$, updateSearchTerm } = this.search.createGlobalSearchInstance(
      searchConfig,
      this.locationSearchTerm,
    );

    searchResults$.pipe(takeUntilDestroyed()).subscribe((newResultSets) => {
      if (newResultSets === null) {
        // request aborted by a newer search
        return;
      }
      this.locationResults.set(newResultSets);
      if (this.locationSearchTerm().length > 1) {
        this.locationAutocompleteTrigger()?.openPanel();
      }
    });

    effect(() => updateSearchTerm(this.locationSearchTerm()));
  }

  /**
   * `<app-search-autocomplete>` exposes its MatAutocomplete via its own @ViewChild, resolved only
   * after that child's view init - i.e. after this dialog's first change-detection pass already
   * read `[matAutocomplete]`. Inside a MatDialog that ordering trips NG0100, so run one extra
   * pass once the view exists. (geocoder.component.ts does not hit this: it is not rendered
   * through a dialog portal.)
   */
  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  selectionLabel(selection: ResourceDeploySelection): string {
    return `${selection.quantity} × ${selection.article.name}`;
  }

  selectionSignature(selection: ResourceDeploySelection): SignaturePreview {
    return this.toPreview(resolveResourceSignId(selection.article));
  }

  journalEntryLabel(entry: JournalEntry): string {
    return `#${entry.messageNumber} · ${entry.messageSubject}`;
  }

  changeSignature(): void {
    const ref = this.dialog.open(SelectSignDialog);
    ref.afterClosed().subscribe((sign: Sign | undefined) => {
      if (sign?.id !== undefined) {
        this.symbolOverride.set(sign.id as number);
      }
    });
  }

  async locationSelected(value: IZsMapSearchResult): Promise<void> {
    this.pickedLocation.set(value);
    this.locationSearchTerm.set('');
    this.pickedCoordinates.set(undefined);
    this.pickedCoordinates.set(await this.resolveCoordinate(value));
  }

  /** Same precedence as `SearchService.highlightResult()`: coordinate, lonLat, geometry, centre. */
  private async resolveCoordinate(result: IZsMapSearchResult): Promise<number[] | undefined> {
    if (result.mercatorCoordinates) {
      return result.mercatorCoordinates;
    }
    if (result.lonLat) {
      return fromLonLat(result.lonLat);
    }
    let feature = result.feature;
    if (!feature && result.internal?.origin && result.internal?.featureId) {
      feature =
        (await this.search.geoAdminGeometryByOriginAndId(
          result.internal.origin,
          result.internal.featureId,
          result.internal.layer,
        )) ?? undefined;
    }
    const extent = feature?.getGeometry()?.getExtent();
    if (extent) {
      return getCenter(extent);
    }
    return result.internal?.center;
  }

  placeAtLocation(): void {
    const coordinates = this.pickedCoordinates();
    if (!coordinates) {
      return;
    }
    const request = this.buildRequest();
    this.placement.deploy(request, coordinates);
    this.closeForPlacement();
  }

  placeOnMap(): void {
    const request = this.buildRequest();
    this.placement.startClickPlacement(request);
    this.closeForPlacement();
  }

  placeAtCenter(): void {
    const request = this.buildRequest();
    this.placement.deploy(request, this.state.getMapCenter());
    this.closeForPlacement();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private buildRequest(): ResourceDeployRequest {
    const mode = this.mode();
    return {
      mode,
      selections: this.selections,
      name: mode === 'collection' ? this.name().trim() || undefined : undefined,
      symbolId: mode === 'collection' ? this.symbolOverride() : undefined,
      messageNumber: this.messageNumber(),
    };
  }

  /**
   * Closes this dialog and, with it, every other open dialog - so the map behind them is
   * actually visible once resources are placed. The catalogue table that opens this dialog
   * (`ResourceCatalogueComponent.deploy()`) is itself shown inside `ResourceOverviewComponent`,
   * opened as its own full-size MatDialog by `sidebar-menu.component.ts`; neither hands this
   * component their `MatDialogRef`, so closing every open dialog from here is the only way to
   * guarantee that overview dialog doesn't keep covering the map after placement. Nothing reads
   * this dialog's close result, so dropping it is safe.
   */
  private closeForPlacement(): void {
    this.dialog.closeAll();
  }

  private toPreview(symbolId: number): SignaturePreview {
    const sign = Signs.getSignById(symbolId);
    return {
      url: sign ? DrawStyle.getSignatureURI(sign) : '',
      label: sign ? this.i18n.getLabelForSign(sign) : '',
      isPlaceholder: symbolId === Signs.RESOURCE_PLACEHOLDER_SIGN_ID,
    };
  }
}
