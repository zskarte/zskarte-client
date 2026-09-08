import { Component, TemplateRef, computed, inject, viewChild } from '@angular/core';
import { I18NService } from '../../state/i18n.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ZsMapStateService } from '../../state/state.service';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { SessionService } from '../../session/session.service';
import { ZsMapBaseDrawElement } from '../../map-renderer/elements/base/base-draw-element';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { exportListViewExcel, mapListViewEntry, ListViewEntry } from '../../helper/listViewEntry';
import { ListViewTableComponent } from '../../list-view-table/list-view-table.component';
import { ShareDialogComponent } from '../../session/share-dialog/share-dialog.component';
import { RevokeShareDialogComponent } from '../../session/revoke-share-dialog/revoke-share-dialog.component';
import { OperationService } from '../../session/operations/operation.service';
import { first } from 'rxjs/operators';
import { ChangeType, ProjectionSelectionComponent } from '../../projection-selection/projection-selection.component';
import { SidebarContext } from '../sidebar.interfaces';
import { SidebarService } from '../sidebar.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { IncidentSelectComponent } from '../../incident-select/incident-select.component';
import { MatMenuModule } from '@angular/material/menu';
import { Locale, LOCALES, PermissionType, AccessTokenType } from '@zskarte/types';
import { PersonRecoveryComponent } from '../../person-recovery/person-recovery.component';
import { ResourceOverviewComponent } from '../../resource-overview/resource-overview.component';
import { OrganisationSettings } from '../../organisation-settings/organisation-settings';
import { VersionService } from '../../version/version.service';
import { DialogBodyComponent, DialogFooterComponent, DialogHeaderComponent } from '../../ui/dialog-layout';
import { projectionByIndex } from '../../helper/projections';
import { ChangeTableComponent } from '../../changeset/change-table/change-table.component';
import { ChangesetService } from '../../changeset/changeset.service';
import { exportChangeExcel, mapChangeEntry } from '../../helper/changeEntry';
import { SigningService } from '../../changeset/signing.service';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrl: './sidebar-menu.component.scss',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    IncidentSelectComponent,
    MatMenuModule,
    AsyncPipe,
    CommonModule,
    MatDialogModule,
    ProjectionSelectionComponent,
    MatButtonModule,
    DialogHeaderComponent,
    DialogBodyComponent,
    DialogFooterComponent,
  ],
})
export class SidebarMenuComponent {
  i18n = inject(I18NService);
  dialog = inject(MatDialog);
  zsMapStateService = inject(ZsMapStateService);
  session = inject(SessionService);
  private datePipe = inject(DatePipe);
  private _dialog = inject(MatDialog);
  private _operation = inject(OperationService);
  sidebar = inject(SidebarService);
  private router = inject(Router);
  version = inject(VersionService);
  private _changeset = inject(ChangesetService);
  private _signing = inject(SigningService);
  appVersion = computed(() => this.version.versionInfos()?.version);

  readonly projectionSelectionTemplate = viewChild.required<TemplateRef<unknown>>('projectionSelectionTemplate');

  locales: Locale[] = LOCALES;
  listViewEntries: ListViewEntry[] = [];
  public incidents = new BehaviorSubject<number[]>([]);
  public hasWritePermission = false;
  public isArchived = true;
  public localOperation = false;

  constructor() {
    this.incidents.next(this.session.getOperationEventStates() || []);
    this.hasWritePermission = this.session.hasWritePermission();
    this.isArchived = this.session.isArchived();
    this.localOperation = this.session.getOperationId()?.startsWith('local-') ?? false;
  }

  async updateIncidents(incidents: number[]): Promise<void> {
    const operation = this.session.getOperation();
    if (operation) {
      if (operation.eventStates.toString() !== incidents.toString()) {
        operation.eventStates = incidents;
        await this._operation.updateMeta(operation);
      }
    }
  }

  toggleHistory(): void {
    this.zsMapStateService.toggleDisplayMode();
  }

  help(): void {
    this.router.navigate(['/help']);
  }

  showExpertViewHelp() {
    this.router.navigate(['/help', 'expert-view']);
  }

  listViewTable(): void {
    this.dialog.open(ListViewTableComponent);
  }

  changeTable(): void {
    this.dialog.open(ChangeTableComponent);
  }

  personRecovery(): void {
    this.dialog.open(PersonRecoveryComponent);
  }

  openResourceOverviewWindow(): void {
    this.dialog.open(ResourceOverviewComponent, { width: '90vw', maxWidth: '1400px', height: '85vh' });
  }

  organisationSettings(): void {
    this.dialog.open(OrganisationSettings);
  }

  listViewExcelExport(): void {
    const projectionDialog = this.dialog.open(this.projectionSelectionTemplate(), {
      width: '450px',
      data: {
        projectionFormatIndex: 0,
        numerical: true,
      } as ChangeType,
    });
    projectionDialog.afterClosed().subscribe((result: ChangeType | undefined) => {
      if (result) {
        this.zsMapStateService
          .observeDrawElements()
          .pipe(first())
          .subscribe(async (elements: ZsMapBaseDrawElement[]) => {
            this.listViewEntries = mapListViewEntry(
              elements,
              this.datePipe,
              this.i18n,
              this.session.getLocale() === undefined ? 'de' : this.session.getLocale(),
              projectionByIndex(result.projectionFormatIndex ?? 0),
              result.numerical ?? true,
            );
            await exportListViewExcel(this.listViewEntries, this.i18n, this.session.getOperationName() ?? '');
          });
      }
    });
  }

  changeExcelExport() {
    const projectionDialog = this.dialog.open(this.projectionSelectionTemplate(), {
      width: '450px',
      data: {
        projectionFormatIndex: 0,
        numerical: true,
      } as ChangeType,
    });
    projectionDialog.afterClosed().subscribe(async (result: ChangeType | undefined) => {
      if (result) {
        const operation = this.session.getOperation();
        if (operation?.changesets) {
          let mapState = await firstValueFrom(this.zsMapStateService.observeMapState());
          mapState = this._changeset.stashCurrentChangesetTemporary(mapState);
          if (mapState && operation) {
            const data = await mapChangeEntry(
              mapState,
              this.datePipe,
              this.i18n,
              this._signing,
              operation,
              projectionByIndex(result.projectionFormatIndex ?? 0),
              result.numerical ?? true,
            );

            await exportChangeExcel(data, this.i18n, this.session.getOperationName() ?? '');
          }
        }
      }
    });
  }

  print(): void {
    this.sidebar.toggle(SidebarContext.Print);
  }

  setLocale(locale: Locale) {
    this.session.setLocale(locale);
  }

  async navigateEvents() {
    await this.zsMapStateService.finishCurrentChangeset();
    this.session.setOperation(undefined);
  }

  async logout() {
    await this.zsMapStateService.finishCurrentChangeset();
    this.session.logout('logout');
  }

  async generateShareLink(readOnly: boolean, isOneWayLink: boolean) {
    const joinCode = await this.session.generateShareLink(
      readOnly ? PermissionType.READ : PermissionType.WRITE,
      isOneWayLink ? AccessTokenType.SHORT : AccessTokenType.LONG,
    );
    this._dialog.open(ShareDialogComponent, {
      data: joinCode,
    });
  }

  showRevokeShareDialog() {
    this._dialog.open(RevokeShareDialogComponent);
  }
}
