import {ChangeDetectorRef, Component, OnInit,} from '@angular/core';
import {I18NService, LOCALES} from '../core/i18n.service';
import {MatDialog} from '@angular/material/dialog';
import {HelpComponent} from '../help/help.component';
import {DomSanitizer} from '@angular/platform-browser';
import {ZsMapStateService} from "../state/state.service";
import {ZsMapDisplayMode} from '../state/interfaces';
import {IZsSession} from '../core/entity/session';
import {SessionCreatorComponent} from "../session-creator/session-creator.component";
import {Observable} from "rxjs";

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {

  static ONBOARDING_VERSION = '1.0';

  historyMode: ZsMapDisplayMode = ZsMapDisplayMode.DRAW;
  session: Observable<IZsSession | null>;
  exportEnabled = true;
  downloadData = null;
  downloadCSVData = null;
  locales: string[] = LOCALES;

  constructor(
    public i18n: I18NService,
    private cdr: ChangeDetectorRef,
    public mapState: ZsMapStateService,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer,
    public zsMapStateService: ZsMapStateService,
  ) {
    this.session = this.zsMapStateService.observeSession();
    /*
    this.zsMapStateService.observeDisplayState().subscribe((mode) => {
      this.historyMode = ZsMapDisplayMode.HISTORY;
      window.history.pushState(null, '', '?mode=' + mode);
    });*/

    /*

    this.sharedState.sessionOutdated.subscribe((isOutdated) => {
      if (isOutdated) {
        this.createInitialSession();
      }
    });
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
      localStorage.setItem(
        'onboardingVersion',
        ToolbarComponent.ONBOARDING_VERSION
      );
      return true;
    }
    return false;
  }

  /*
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only handle global events (to prevent input elements to be considered)
    const globalEvent = event.target instanceof HTMLBodyElement;
    if (
      globalEvent &&
      !this.sharedState.featureSource.getValue() &&
      event.altKey
    ) {
      switch (event.code) {
        case 'KeyH':
          this.toggleHistory();
          break;
      }
    }
  }*/


  ngOnInit() {
    this.zsMapStateService.observeSession().subscribe((s) => {
      /*this.session = s;
      if (s) {
        const currentZSO = this.preferences.getZSO();
        this.exportEnabled = currentZSO != null && currentZSO.id != 'zso_guest';
        this.preferences.setLastSessionId(s.uuid);
      }*/
    });
    /*
    const lastSession = this.preferences.getLastSessionId();
    if (lastSession) {
      const session = this.sessions.getSession(lastSession);
      if (session) {
        this.sharedState.loadSession(JSON.parse(session));
        return;
      }
    }*/
    this.createInitialSession();
  }

  private createInitialSession() {
    this.dialog.open(SessionCreatorComponent, {
      data: {
        session: this.session,
        edit: false,
      },
      disableClose: true,
      width: '80vw',
      maxWidth: '80vw',
    });
  }

  /*
  createOrLoadSession() {
    this.dialog.open(SessionCreatorComponent, {
      data: {
        session: this.session,
        edit: false,
      },
      width: '80vw',
      maxWidth: '80vw',
    });
  }*/

  /*
  editSession() {
    this.dialog.open(SessionCreatorComponent, {
      data: {
        session: this.session,
        edit: true,
      },
      width: '80vw',
      maxWidth: '80vw',
    });
  }*/

  /*
  deleteSession(): void {
    if (this.session) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: this.i18n.get('confirmDeleteMap'),
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.mapStore.removeMap(this.session.uuid, true);
          this.sessions.removeSession(this.session.uuid);
          this.preferences.removeSessionSpecificPreferences(this.session.uuid);
          this.sharedState.loadSession(null);
          this.createInitialSession();
        }
      });
    }
  }*/

  /*
  exportSession(): void {
    const features = this.drawLayer.writeFeatures();
    this.dialog.open(ExportDialogComponent, {
      data: features,
    });
  }*/

  /*
  toggleHistory(): void {
    if (this.zsMapStateService.displayMode.getValue() == DisplayMode.HISTORY) {
      this.sharedState.displayMode.next(DisplayMode.DRAW);
    } else {
      this.sharedState.displayMode.next(DisplayMode.HISTORY);
    }
  }*/

  help(): void {
    this.dialog.open(HelpComponent, { data: false });
  }

  /*
  importData(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, {
      maxWidth: '80vw',
      maxHeight: '80vh',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.value) {
        this.dialog
          .open(ConfirmationDialogComponent, {
            data: result.replace
              ? this.i18n.get('confirmImportDrawing')
              : this.i18n.get('confirmImportDrawingNoReplace'),
          })
          .afterClosed()
          .subscribe((confirmed) => {
            if (confirmed) {
              this.drawLayer.loadFromString(result.value, true, result.replace);
            }
          });
      }
    });
  }*/

  getDownloadFileName() {
    return 'zskarte_' + new Date().toISOString() + '.geojson';
  }

  /*
  download(): void {
    this.downloadData = this.sanitizer.bypassSecurityTrustUrl(
      this.drawLayer.toDataUrl()
    );
  }*/

  getDownloadFileNameCSV() {
    return 'zskarte_' + new Date().toISOString() + '.csv';
  }

  /*
  downloadCSV(): void {
    this.downloadCSVData = this.sanitizer.bypassSecurityTrustUrl(
      this.drawLayer.toCSVDataUrl()
    );
  }*/

  print(): void {
    window.print();
  }

  /*
  clear(): void {
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: this.i18n.get('confirmClearDrawing'),
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.drawLayer.removeAll();
        }
      });
  }*/

  /*
  tagState(): void {
    const dialogRef = this.dialog.open(TagStateComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.mapStore.setTag(result).then(() => {});
      }
    });
  }*/

  setLocale(locale: string) {
    this.i18n.locale = locale;
  }
}
