import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import { ResourceArticle, ResourceImportRequestApi } from '@zskarte/types';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogHeaderComponent, DialogBodyComponent, DialogFooterComponent } from '../../ui/dialog-layout';
import { I18NService } from '../../state/i18n.service';
import { SessionService } from '../../session/session.service';
import { ResourceService } from '../resource.service';
import { parseResourceCsv, ResourceCsvIssue, ResourceCsvParseResult } from './resource-csv.parser';
import { aggregateResourceArticles } from './resource-aggregate';

type ImportStep = 'file' | 'preview';

interface AggregateResult {
  articles: ResourceArticle[];
  warnings: ResourceCsvIssue[];
}

@Component({
  selector: 'app-resource-import-dialog',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DialogHeaderComponent,
    DialogBodyComponent,
    DialogFooterComponent,
  ],
  templateUrl: './resource-import-dialog.component.html',
  styleUrl: './resource-import-dialog.component.scss',
})
export class ResourceImportDialogComponent {
  /** Self-documenting template offered next to the file picker; see `ResourceOverviewComponent`. */
  readonly exampleCsvUrl = 'assets/doc/resource/mittel-beispiel.csv';
  readonly exampleCsvFileName = 'mittel-beispiel.csv';

  private dialogRef = inject<MatDialogRef<ResourceImportDialogComponent, boolean>>(MatDialogRef);
  private session = inject(SessionService);
  private snackBar = inject(MatSnackBar);
  resourceService = inject(ResourceService);
  i18n = inject(I18NService);

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly step = signal<ImportStep>('file');
  readonly fileName = signal<string | undefined>(undefined);
  readonly parsing = signal(false);
  readonly committing = signal(false);
  readonly commitError = signal<string | undefined>(undefined);

  readonly parseResult = signal<ResourceCsvParseResult | undefined>(undefined);
  readonly aggregateResult = signal<AggregateResult | undefined>(undefined);

  readonly canCommit = computed(
    () => !!this.aggregateResult() && (this.parseResult()?.errors.length ?? 0) === 0 && !this.committing(),
  );

  onFileSelected(): void {
    const file = this.fileInput().nativeElement.files?.[0];
    this.fileName.set(file?.name);
  }

  async readFile(): Promise<void> {
    const file = this.fileInput().nativeElement.files?.[0];
    if (!file) {
      return;
    }
    this.parsing.set(true);
    this.commitError.set(undefined);
    try {
      const buffer = await file.arrayBuffer();
      const parseResult = parseResourceCsv(buffer);
      this.parseResult.set(parseResult);
      this.aggregateResult.set(parseResult.errors.length === 0 ? aggregateResourceArticles(parseResult.rows) : undefined);
      this.step.set('preview');
    } finally {
      this.parsing.set(false);
    }
  }

  backToFileStep(): void {
    this.step.set('file');
    this.parseResult.set(undefined);
    this.aggregateResult.set(undefined);
    this.commitError.set(undefined);
  }

  async commitImport(): Promise<void> {
    const articles = this.aggregateResult()?.articles;
    if (!articles) {
      return;
    }
    const operation = this.session.getOperationId();
    const organization = this.session.getOrganization()?.documentId;
    if (!operation || !organization) {
      this.commitError.set(this.i18n.get('resourceImportOnlineOnly'));
      return;
    }

    this.committing.set(true);
    this.commitError.set(undefined);
    const meta = this.parseResult()?.meta;
    const request: ResourceImportRequestApi = {
      importId: uuidv4(),
      sourceExportedAt: meta?.sourceExportedAt,
      sourceOrganisation: meta?.sourceOrganisation,
      operation,
      organization,
      articles,
    };
    try {
      const { error } = await this.resourceService.commitImport(request);
      if (error) {
        this.commitError.set(this.describeError(error));
        return;
      }
      this.snackBar.open(this.i18n.get('resourceImportSuccess'), 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } finally {
      this.committing.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return (error.error?.error?.message as string | undefined) || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
