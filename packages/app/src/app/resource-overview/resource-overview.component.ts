import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogHeaderComponent, DialogBodyComponent } from '../ui/dialog-layout';
import { I18NService } from '../state/i18n.service';
import { SessionService } from '../session/session.service';
import { ResourceService } from '../resource/resource.service';
import { ResourceCatalogueComponent } from '../resource/catalogue/resource-catalogue.component';
import { ResourceDeployedComponent } from '../resource/deployed/resource-deployed.component';
import { ResourceFormationTableComponent } from '../resource/formations/resource-formation-table.component';
import { ResourceImportDialogComponent } from '../resource/import/resource-import-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-resource-overview',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    DialogHeaderComponent,
    DialogBodyComponent,
    ResourceCatalogueComponent,
    ResourceDeployedComponent,
    ResourceFormationTableComponent,
  ],
  templateUrl: './resource-overview.component.html',
  styleUrl: './resource-overview.component.scss',
})
export class ResourceOverviewComponent {
  private dialog = inject(MatDialog);
  private session = inject(SessionService);
  resourceService = inject(ResourceService);
  i18n = inject(I18NService);

  /**
   * Downloadable, self-documenting template: its rows above the CSV header explain the format
   * and are skipped by the parser, so it doubles as the documentation of the import. Kept in
   * sync with the parser by `resource-csv.parser.spec.ts`, which imports this very file.
   */
  readonly exampleCsvUrl = 'assets/doc/resource/mittel-beispiel.csv';
  readonly exampleCsvFileName = 'mittel-beispiel.csv';

  readonly canImport = this.session.hasWritePermission() && !this.session.isArchived();
  readonly isOnline = toSignal(this.session.observeIsOnline(), { initialValue: this.session.isOnline() });

  /** True once a catalogue exists, i.e. there is something that could be cleared. */
  get hasCatalogue(): boolean {
    return this.resourceService.articles().length > 0;
  }

  openImportDialog(): void {
    if (!this.canImport || !this.isOnline()) {
      return;
    }
    this.dialog.open(ResourceImportDialogComponent, { width: '700px', maxWidth: '95vw' });
  }

  /**
   * Clears the whole catalogue of this operation, e.g. before re-importing a corrected export.
   * An import with an empty article list is exactly the "replace" the endpoint already performs,
   * so no dedicated delete endpoint is needed.
   *
   * Markers already placed on the map are deliberately kept - they then show up as
   * "Nicht im Katalog", consistent with the re-import behaviour. The confirmation says so.
   */
  clearCatalogue(): void {
    if (!this.canImport || !this.isOnline() || !this.hasCatalogue) {
      return;
    }
    const confirmation = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.i18n.get('resourceClearTitle'),
        message: this.i18n.get('resourceClearConfirm'),
        confirmLabel: this.i18n.get('resourceClear'),
      },
    });
    confirmation.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) {
        return;
      }
      const operationId = this.session.getOperationId();
      const organizationId = this.session.getOrganization()?.documentId;
      if (!operationId || !organizationId) {
        return;
      }
      await this.resourceService.commitImport({
        operation: operationId,
        organization: organizationId,
        importId: uuidv4(),
        articles: [],
      });
    });
  }
}
