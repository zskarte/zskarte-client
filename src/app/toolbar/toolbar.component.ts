import { ChangeDetectorRef, Component, HostListener, ViewChild } from '@angular/core';
import { I18NService, LOCALES } from '../state/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { HelpComponent } from '../help/help.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ZsMapStateService } from '../state/state.service';
import { ZsMapDisplayMode } from '../state/interfaces';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { SessionService } from '../session/session.service';
import { ImportDialogComponent } from '../import-dialog/import-dialog.component';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent {
  @ViewChild(MatMenuTrigger) menu!: MatMenuTrigger;

  static ONBOARDING_VERSION = '1.0';

  historyMode: Observable<boolean>;
  exportEnabled = true;
  downloadData: SafeUrl | null = null;
  locales: string[] = LOCALES;

  constructor(
    public i18n: I18NService,
    private cdr: ChangeDetectorRef,
    public mapState: ZsMapStateService,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer,
    public zsMapStateService: ZsMapStateService,
    public session: SessionService,
  ) {
    this.historyMode = this.zsMapStateService
      .observeDisplayState()
      .pipe(map((displayState) => displayState.displayMode === ZsMapDisplayMode.HISTORY));

    this.zsMapStateService.observeDisplayState().subscribe((mode) => {
      window.history.pushState(null, '', '?mode=' + mode.displayMode);
    });

    if (this.isInitialLaunch()) {
      this.dialog.open(HelpComponent, {
        data: true,
      });
    }
  }

  isInitialLaunch(): boolean {
    const currentOnboardingVersion = localStorage.getItem('onboardingVersion');
    if (currentOnboardingVersion !== ToolbarComponent.ONBOARDING_VERSION) {
      localStorage.setItem('onboardingVersion', ToolbarComponent.ONBOARDING_VERSION);
      return true;
    }
    return false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only handle global events (to prevent input elements to be considered)
    const globalEvent = event.target instanceof HTMLBodyElement;
    if (globalEvent && event.altKey) {
      switch (event.code) {
        case 'KeyH':
          this.toggleHistory();
          break;
      }
    }
  }

  exportSession(): void {
    this.dialog.open(ExportDialogComponent);
  }

  toggleHistory(): void {
    this.zsMapStateService.toggleDisplayMode();
  }


  help(): void {
    this.dialog.open(HelpComponent, { data: false });
  }

  importData(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      maxWidth: '80vw',
      maxHeight: '80vh',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.value) {
        this.dialog
          .open(ConfirmationDialogComponent, {
            data: result.replace ? this.i18n.get('confirmImportDrawing') : this.i18n.get('confirmImportDrawingNoReplace'),
          })
          .afterClosed()
          .subscribe((confirmed) => {
            if (confirmed) {
              this.zsMapStateService.setMapState(JSON.parse(result.value));
            }
          });
      }
    });
  }

  getDownloadFileName() {
    return 'zskarte_' + new Date().toISOString() + '.geojson';
  }

  download(): void {
    this.downloadData = this.sanitizer.bypassSecurityTrustUrl(this.zsMapStateService.exportMap());
  }

  print(): void {
    this.menu.closeMenu();
    setTimeout(() => {
      window.print();
    }, 0);
  }

  clear(): void {
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: this.i18n.get('confirmClearDrawing'),
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.zsMapStateService.reset();
        }
      });
  }

  todo(): void {
    console.error('todo');
  }
}
