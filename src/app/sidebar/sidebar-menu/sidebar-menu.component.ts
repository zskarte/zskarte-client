import { ChangeDetectorRef, Component, ViewChild, TemplateRef } from '@angular/core';
import { I18NService, Locale, LOCALES } from '../../state/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { HelpComponent } from '../../help/help.component';
import { ZsMapStateService } from '../../state/state.service';
import { BehaviorSubject } from 'rxjs';
import { SessionService } from '../../session/session.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { ZsMapBaseDrawElement } from '../../map-renderer/elements/base/base-draw-element';
import { DatePipe } from '@angular/common';
import { exportProtocolExcel, mapProtocolEntry, ProtocolEntry } from '../../helper/protocolEntry';
import { ProtocolTableComponent } from '../../protocol-table/protocol-table.component';
import { ShareDialogComponent } from '../../session/share-dialog/share-dialog.component';
import { AccessTokenType, PermissionType } from '../../session/session.interfaces';
import { RevokeShareDialogComponent } from '../../session/revoke-share-dialog/revoke-share-dialog.component';
import { OperationService } from '../../session/operations/operation.service';
import { first } from 'rxjs/operators';
import { ChangeType } from '../../projection-selection/projection-selection.component';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrl: './sidebar-menu.component.scss',
})
export class SidebarMenuComponent {
  @ViewChild(MatMenuTrigger) menu!: MatMenuTrigger;
  @ViewChild('projectionSelectionTemplate') projectionSelectionTemplate!: TemplateRef<unknown>;

  locales: Locale[] = LOCALES;
  protocolEntries: ProtocolEntry[] = [];
  public incidents = new BehaviorSubject<number[]>([]);

  constructor(
    public i18n: I18NService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    public zsMapStateService: ZsMapStateService,
    public session: SessionService,
    private datePipe: DatePipe,
    private _dialog: MatDialog,
    private _operation: OperationService,
  ) {
    this.incidents.next(this.session.getOperationEventStates() || []);
  }

  async updateIncidents(incidents: number[]): Promise<void> {
    const operation = this.session.getOperation();
    if (operation) {
      operation.eventStates = incidents;
      await this._operation.updateMeta(operation);
    }
  }

  toggleHistory(): void {
    this.zsMapStateService.toggleDisplayMode();
  }

  help(): void {
    this.dialog.open(HelpComponent, { data: false });
  }

  protocolTable(): void {
    this.dialog.open(ProtocolTableComponent, { data: false });
  }

  protocolExcelExport(): void {
    const projectionDialog = this.dialog.open(this.projectionSelectionTemplate, {
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
          .subscribe((elements: ZsMapBaseDrawElement[]) => {
            this.protocolEntries = mapProtocolEntry(
              elements,
              this.datePipe,
              this.i18n,
              this.session.getLocale() === undefined ? 'de' : this.session.getLocale(),
              result.projectionFormatIndex ?? 0,
              result.numerical ?? true,
            );
            exportProtocolExcel(this.protocolEntries, this.i18n);
          });
      }
    });
  }

  print(): void {
    this.menu.closeMenu();
    setTimeout(() => {
      window.print();
    }, 0);
  }

  setLocale(locale: Locale) {
    this.session.setLocale(locale);
  }

  navigateEvents() {
    this.session.setOperation(undefined);
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
