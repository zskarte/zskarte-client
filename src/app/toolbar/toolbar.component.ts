import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { I18NService, LOCALES } from '../state/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { HelpComponent } from '../help/help.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ZsMapStateService } from '../state/state.service';
import { ZsMapDisplayMode } from '../state/interfaces';
import { IZsSession } from '../core/entity/session';
import { SessionCreatorComponent } from '../session-creator/session-creator.component';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { PreferencesService } from '../state/preferences.service';
import { SessionsService } from '../state/sessions.service';
import { ImportDialogComponent } from '../import-dialog/import-dialog.component';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
  static ONBOARDING_VERSION = '1.0';

  session: Observable<IZsSession | null>;
  historyMode: Observable<boolean>;
  exportEnabled = true;
  downloadData: SafeUrl | null = null;
  downloadCSVData = null;
  locales: string[] = LOCALES;

  constructor(
    public i18n: I18NService,
    private cdr: ChangeDetectorRef,
    public mapState: ZsMapStateService,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer,
    public zsMapStateService: ZsMapStateService,
    public preferences: PreferencesService,
    private sessions: SessionsService,
  ) {
    this.session = this.zsMapStateService.observeSession();
    this.historyMode = this.zsMapStateService
      .observeDisplayState()
      .pipe(map((displayState) => displayState.displayMode === ZsMapDisplayMode.HISTORY));

    this.zsMapStateService.observeDisplayState().subscribe((mode) => {
      window.history.pushState(null, '', '?mode=' + mode.displayMode);
    });

    this.zsMapStateService.observeSession().subscribe((session) => {
      /*if (session?.isOutdated()) {
        this.createInitialSession();
      }*/
    });

    // TODO: Is this needed?
    /*
    this.sharedState.historyDate.subscribe((historyDate) =>
      historyDate === 'now'
        ? (this.downloadTime = new Date().toISOString())
        : (this.downloadTime = historyDate)
    );
    */

    if (this.isinitialLaunch()) {
      this.dialog.open(HelpComponent, {
        data: true,
      });
    }
  }

  isinitialLaunch(): boolean {
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

  ngOnInit() {
    this.zsMapStateService.observeSession().subscribe((s) => {
      if (s !== null) {
        const currentZSO = this.preferences.getZSO();
        this.exportEnabled = currentZSO != null && currentZSO.id != 'zso_guest';
        this.preferences.setLastSessionId(s.uuid);
      }
    });

    const lastSession = this.preferences.getLastSessionId();
    if (lastSession) {
      const session = this.sessions.getSession(lastSession);
      if (session) {
        this.zsMapStateService.loadSession(JSON.parse(session));
        return;
      }
    }
    this.createInitialSession();
  }

  private async createInitialSession() {
    const currentSession = await firstValueFrom(this.session);
    this.dialog.open(SessionCreatorComponent, {
      data: {
        session: currentSession,
        edit: false,
      },
      disableClose: true,
      width: '80vw',
      maxWidth: '80vw',
    });
  }

  async createOrLoadSession() {
    const currentSession = await firstValueFrom(this.session);
    this.dialog.open(SessionCreatorComponent, {
      data: {
        session: currentSession,
        edit: false,
      },
      width: '80vw',
      maxWidth: '80vw',
    });
  }

  async editSession() {
    const currentSession = await firstValueFrom(this.session);
    this.dialog.open(SessionCreatorComponent, {
      data: {
        session: currentSession,
        edit: true,
      },
      width: '80vw',
      maxWidth: '80vw',
    });
  }

  async deleteSession() {
    const currentSession = await firstValueFrom(this.session);

    if (currentSession) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: this.i18n.get('confirmDeleteMap'),
      });
      dialogRef.afterClosed().subscribe(async (result) => {
        if (result) {
          this.sessions.removeSession(currentSession.uuid);
          this.preferences.removeSessionSpecificPreferences(currentSession.uuid);
          this.zsMapStateService.reset();
          await this.createInitialSession();
        }
      });
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
              this.zsMapStateService.loadMapState(JSON.parse(result.value));
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
    window.print();
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

  setLocale(locale: string) {
    this.i18n.locale = locale;
  }
}
