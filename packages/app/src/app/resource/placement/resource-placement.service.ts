import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import {
  ResourceArticle,
  ResourceAssignment,
  ZsMapDrawElementState,
  ZsMapDrawElementStateType,
  ZsMapLayerState,
  ZsMapLayerStateType,
} from '@zskarte/types';
import { ZsMapStateService } from '../../state/state.service';
import { I18NService } from '../../state/i18n.service';
import { JournalService } from '../../journal/journal.service';
import { GuestLimitDialogComponent } from '../../guest-limit-dialog/guest-limit-dialog.component';
import { resolveCollectionSignId, resolveResourceSignId } from '../resource-signature.mapping';
import { ResourceAddOption, appendResourceAssignment } from '../resource-assignment-picker';

/**
 * Name of the shared draw layer that collects every deployed resource. Kept as a plain
 * constant, NOT an i18n lookup: this name is written into the shared operation data, so every
 * team member must see and match the very same layer name regardless of their own UI language.
 */
export const RESOURCE_LAYER_NAME = 'Mittel im Einsatz';

/** Pending selection for one article, as produced by the resource catalogue's multi-select. */
export interface ResourceDeploySelection {
  article: ResourceArticle;
  quantity: number;
  itemKeys: string[];
}

/** Everything the placement dialog gathered from the user; deploying does not mutate it. */
export interface ResourceDeployRequest {
  mode: 'collection' | 'single';
  selections: ResourceDeploySelection[];
  /** Collection mode only. */
  name?: string;
  /** Collection mode only - overrides `resolveCollectionSignId(...)`. */
  symbolId?: number;
  messageNumber?: number;
}

/** One marker to be placed on the map: its pictogram, optional label and the resources it carries. */
interface ResourceMarkerPlan {
  symbolId: number;
  name?: string;
  resourceItems: ResourceAssignment[];
}

/**
 * Spacing/angle for the fan-out of markers that share one placement point (single mode with
 * several pieces, or several markers dropped at the same map-centre click). Map units here are
 * metres (the map's Web-Mercator projection), so `SPACING` is ~15m between neighbouring rings.
 * A golden-angle spiral is used so successive markers don't line up radially.
 */
const SPACING = 15;
const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);

function spiralOffset(index: number): [number, number] {
  if (index <= 0) {
    return [0, 0];
  }
  const angle = index * GOLDEN_ANGLE;
  const radius = SPACING * Math.sqrt(index);
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

/**
 * Splits one catalogue selection into `ResourceAssignment` records: one per serialised piece
 * (quantity 1, carrying that piece's `itemKey` and `serialNumber`), plus - when the selected
 * quantity exceeds the number of specific pieces picked - one aggregated record for the
 * fungible remainder. `ResourceAssignment` only carries a single optional `itemKey`, so a
 * serialised piece and a generic quantity can never share one record.
 */
function buildAssignments(selection: ResourceDeploySelection): ResourceAssignment[] {
  const { article, quantity, itemKeys } = selection;
  const assignments: ResourceAssignment[] = itemKeys.map((itemKey) => {
    const item = article.items.find((candidate) => candidate.itemKey === itemKey);
    return {
      articleNumber: article.articleNumber,
      name: article.name,
      quantity: 1,
      serialNumber: item?.serialNumber,
      itemKey,
    };
  });

  const remainder = quantity - itemKeys.length;
  if (remainder > 0) {
    assignments.push({ articleNumber: article.articleNumber, name: article.name, quantity: remainder });
  }

  return assignments;
}

/** How many individual markers `single` mode would create for this selection set. */
export function countSingleModeMarkers(selections: ResourceDeploySelection[]): number {
  return selections.reduce((sum, selection) => sum + buildAssignments(selection).length, 0);
}

function buildMarkerPlans(request: ResourceDeployRequest): ResourceMarkerPlan[] {
  if (request.mode === 'collection') {
    const resourceItems = request.selections.flatMap((selection) => buildAssignments(selection));
    const symbolId =
      request.symbolId ?? resolveCollectionSignId(request.selections.map((selection) => selection.article));
    return [{ symbolId, name: request.name, resourceItems }];
  }

  return request.selections.flatMap((selection) =>
    buildAssignments(selection).map((assignment) => ({
      symbolId: resolveResourceSignId(selection.article),
      name: assignment.quantity > 1 ? `${assignment.quantity}× ${assignment.name}` : assignment.name,
      resourceItems: [assignment],
    })),
  );
}

/**
 * Places selected catalogue resources on the map, either as one collection marker or as one
 * marker per resource - either at a given coordinate (map centre) or by letting the user click
 * the map to pick the point (`startClickPlacement`).
 */
@Injectable({
  providedIn: 'root',
})
export class ResourcePlacementService {
  private readonly state = inject(ZsMapStateService);
  private readonly journal = inject(JournalService);
  private readonly i18n = inject(I18NService);
  private readonly dialog = inject(MatDialog);

  /** Label of the placement currently waiting for a map click; undefined when none is pending. */
  readonly pendingLabel = signal<string | undefined>(undefined);

  private clickSubscription?: Subscription;

  /** Places every marker of `request` at `coordinates` (further markers fan out from it). Returns the created element ids. */
  deploy(request: ResourceDeployRequest, coordinates: number[]): string[] {
    const layer = this.requireResourceLayer();
    if (!layer) {
      return [];
    }

    const ids = this.placePlans(buildMarkerPlans(request), layer, coordinates, request);
    if (ids.length > 0) {
      this.state.setSelectedFeature(ids[0]);
      this.state.setMapCenter(coordinates);
    }
    return ids;
  }

  /**
   * Arms click-to-place: reuses the app's existing symbol-drawing interaction
   * (`state.drawElement(...)`, consumed by `map-renderer.service.ts` / `ZsMapSymbolDrawElement`,
   * the same path `copySymbol` uses) to let the user pick a point on the map with a single
   * click. That interaction only creates a bare `{symbolId, layer, coordinates}` element, so
   * once it fires (surfaced via `observeSelectedFeature$()`, which `ZsMapSymbolDrawElement`
   * updates right after creation) this stamps the remaining fields - name, resourceItems,
   * message - onto it, then places any further markers (single mode) fanning out from the
   * clicked point.
   */
  startClickPlacement(request: ResourceDeployRequest): void {
    const layer = this.requireResourceLayer();
    if (!layer) {
      return;
    }

    const [first, ...rest] = buildMarkerPlans(request);

    // Wait for the element the draw interaction actually creates, identified by diffing the
    // draw elements against the ones that existed when we armed.
    //
    // Do NOT key this off observeSelectedFeature$: that emits on *any* selection change, so
    // clicking an existing feature - or a stale/removed selection - made us stamp
    // `resourceItems` onto the wrong (or a no longer existing) element. The resulting patch
    // `drawElements/<id>/resourceItems` then fails to resolve, which breaks changeset sync for
    // everyone in the operation and makes the server reject the changeset.
    const knownIds = new Set(Object.keys(this.currentDrawElements()));
    this.clickSubscription?.unsubscribe();

    let matched = false;
    const subscription = new Subscription();

    subscription.add(
      this.state
        .observeMapState()
        .pipe(
          map((mapState) =>
            Object.values(mapState?.drawElements ?? {}).find(
              (element) =>
                element.id &&
                !knownIds.has(element.id) &&
                element.layer === layer &&
                element.symbolId === first.symbolId &&
                // never hijack an element that already carries assignments
                !element.resourceItems?.length,
            ),
          ),
          filter((element): element is ZsMapDrawElementState => !!element?.id),
          take(1),
        )
        .subscribe((element) => {
          matched = true;
          this.finishClickPlacement(element.id as string, layer, first, rest, request);
        }),
    );

    this.clickSubscription = subscription;
    this.pendingLabel.set(this.labelFor(request));

    this.state.drawElement({ type: ZsMapDrawElementStateType.SYMBOL, layer, symbolId: first.symbolId });

    // Disarm as soon as the draw interaction ends without having produced our element (Esc,
    // switching tool, ...). Without this the subscription stayed armed indefinitely and the
    // next element appearing on the shared layer - including one synced from another user -
    // would get this placement's resourceItems stamped onto it.
    subscription.add(
      this.state
        .observeElementToDraw()
        .pipe(
          filter((element) => !element),
          take(1),
        )
        .subscribe(() => {
          if (!matched) {
            this.cancelClickPlacement();
          }
        }),
    );
  }

  /** Cancels a pending click-to-place, if any. */
  cancelClickPlacement(): void {
    if (!this.clickSubscription) {
      return;
    }
    this.clickSubscription.unsubscribe();
    this.clickSubscription = undefined;
    this.state.cancelDrawing();
    this.pendingLabel.set(undefined);
  }

  private finishClickPlacement(
    id: string,
    layer: string,
    first: ResourceMarkerPlan,
    rest: ResourceMarkerPlan[],
    request: ResourceDeployRequest,
  ): void {
    this.clickSubscription = undefined;

    // The element must still exist: patching a removed element produces an unresolvable patch
    // path, which the server rejects and which breaks every other client's changeset replay.
    if (!this.state.getDrawElementState(id)) {
      this.pendingLabel.set(undefined);
      return;
    }

    if (first.name) {
      this.state.updateDrawElementState(id, 'name', first.name);
    }
    if (first.resourceItems.length > 0) {
      this.state.updateDrawElementState(id, 'resourceItems', first.resourceItems);
    }
    this.stampMessage(id, request);

    const origin = (this.state.getDrawElementState(id)?.coordinates as number[] | undefined) ?? this.state.getMapCenter();
    const restIds = this.placePlans(rest, layer, origin, request, 1);

    this.state.setSelectedFeature(id);
    this.state.setMapCenter(origin);
    this.pendingLabel.set(undefined);
    void restIds;
  }

  private placePlans(
    plans: ResourceMarkerPlan[],
    layer: string,
    origin: number[],
    request: ResourceDeployRequest,
    startIndex = 0,
  ): string[] {
    const ids: string[] = [];
    plans.forEach((plan, planIndex) => {
      const [dx, dy] = spiralOffset(startIndex + planIndex);
      const created = this.state.addDrawElement({
        type: ZsMapDrawElementStateType.SYMBOL,
        layer,
        coordinates: [origin[0] + dx, origin[1] + dy],
        symbolId: plan.symbolId,
        name: plan.name,
        resourceItems: plan.resourceItems,
      });
      if (created?.id) {
        ids.push(created.id);
        this.stampMessage(created.id, request);
      }
    });
    return ids;
  }

  private stampMessage(id: string, request: ResourceDeployRequest): void {
    // addDrawElement() already stamps reportNumber from journal.drawingEntry when one is
    // active; only an explicitly picked message with no active drawing entry needs this.
    if (request.messageNumber && !this.journal.drawingEntry) {
      this.state.updateDrawElementState(id, 'reportNumber', [request.messageNumber]);
    }
  }

  /**
   * Guards against the genuinely broken case (`state.canAddElements()` false, e.g. a guest who
   * hit the draw-element limit) and otherwise hands back the shared resource layer's id - there
   * is no "no active draw layer" case any more since `ensureResourceLayer()` always creates or
   * finds one.
   */
  private requireResourceLayer(): string | undefined {
    if (!this.state.canAddElements()) {
      this.dialog.open(GuestLimitDialogComponent);
      return undefined;
    }
    return this.ensureResourceLayer();
  }

  /** Finds the shared layer, creating it when absent; activates it and returns its id. */
  public ensureResourceLayer(): string {
    const existing = this.findResourceLayer();
    const layerId = existing?.id ?? this.createResourceLayer();
    this.state.activateDrawLayer(layerId);
    return layerId;
  }

  private createResourceLayer(): string {
    this.state.addDrawLayer(RESOURCE_LAYER_NAME);
    // addDrawLayer() returns nothing - re-read the layers to find the one it just created.
    const created = this.findResourceLayer();
    if (!created) {
      throw new Error(`Failed to create draw layer "${RESOURCE_LAYER_NAME}"`);
    }
    return created.id;
  }

  private findResourceLayer(): ZsMapLayerState | undefined {
    return Object.values(this.currentLayers()).find(
      (candidate) => candidate.type === ZsMapLayerStateType.DRAW && candidate.name === RESOURCE_LAYER_NAME,
    );
  }

  /** Synchronous read of the current layers - `observeMapState()` is backed by a `BehaviorSubject`, so `take(1)` resolves immediately. */
  /** Snapshot of the operation's draw elements (observeMapState is a BehaviorSubject). */
  private currentDrawElements(): Record<string, ZsMapDrawElementState> {
    let elements: Record<string, ZsMapDrawElementState> = {};
    this.state
      .observeMapState()
      .pipe(take(1))
      .subscribe((mapState) => {
        elements = mapState?.drawElements ?? {};
      });
    return elements;
  }

  private currentLayers(): Record<string, ZsMapLayerState> {
    let layers: Record<string, ZsMapLayerState> = {};
    this.state
      .observeMapState()
      .pipe(take(1))
      .subscribe((mapState) => {
        layers = mapState.layers ?? {};
      });
    return layers;
  }

  /**
   * Assigns one more resource to an existing marker - the counterpart of `takeBack`, used by
   * the selected-feature panel's resource search. Writing `resourceItems` is all it takes for
   * the piece to count as deployed: `ResourceService.assignmentIndex` derives availability from
   * the map state, so the catalogue drops it from the free stock as soon as this lands.
   */
  public assign(elementId: string, option: ResourceAddOption): void {
    const element = this.state.getDrawElementState(elementId);
    if (!element) {
      return;
    }
    const items = element.resourceItems ?? [];
    if (option.itemKey && items.some((item) => item.itemKey === option.itemKey)) {
      //the same physical piece is already on this marker
      return;
    }
    this.state.updateDrawElementState(elementId, 'resourceItems', appendResourceAssignment(items, option));
  }

  /** Returns one assignment to stock; deletes the marker when it has no assignments left. */
  public takeBack(elementId: string, assignment: ResourceAssignment): void {
    const element = this.state.getDrawElementState(elementId);
    if (!element) {
      return;
    }
    const items = element.resourceItems ?? [];
    const index = items.findIndex((candidate) => this.matchesAssignment(candidate, assignment));
    if (index === -1) {
      return;
    }
    const next = [...items.slice(0, index), ...items.slice(index + 1)];
    this.applyRemainingAssignments(elementId, next);
  }

  /** Returns every assignment of a marker to stock and deletes the marker. */
  public takeBackAll(elementId: string): void {
    this.applyRemainingAssignments(elementId, []);
  }

  private applyRemainingAssignments(elementId: string, next: ResourceAssignment[]): void {
    if (next.length === 0) {
      this.state.removeDrawElement(elementId);
      return;
    }
    this.state.updateDrawElementState(elementId, 'resourceItems', next);
  }

  private matchesAssignment(candidate: ResourceAssignment, assignment: ResourceAssignment): boolean {
    if (assignment.itemKey) {
      return candidate.itemKey === assignment.itemKey;
    }
    return (
      !candidate.itemKey &&
      candidate.articleNumber === assignment.articleNumber &&
      candidate.quantity === assignment.quantity
    );
  }

  private labelFor(request: ResourceDeployRequest): string {
    if (request.mode === 'collection' && request.name?.trim()) {
      return request.name.trim();
    }
    return this.i18n.get(request.mode === 'collection' ? 'resourceDeployCollection' : 'resourceDeploySingle');
  }
}
