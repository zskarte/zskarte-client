import { ChangeDetectorRef, Component, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { I18NService, Locale, LOCALES } from '../state/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { HelpComponent } from '../help/help.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ZsMapStateService } from '../state/state.service';
import { ZsMapDisplayMode } from '../state/interfaces';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { SessionService } from '../session/session.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { DatePipe } from '@angular/common';
import { mapProtocolEntry, ProtocolEntry } from '../helper/mapProtocolEntry';
import { ProtocolTableComponent } from '../protocol-table/protocol-table.component';
import {Router} from "@angular/router";

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnDestroy {
  @ViewChild(MatMenuTrigger) menu!: MatMenuTrigger;

  static ONBOARDING_VERSION = '1.0';

  historyMode: Observable<boolean>;
  locales: Locale[] = LOCALES;
  protocolEntries: ProtocolEntry[] = [];
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    public i18n: I18NService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private sanitizer: DomSanitizer,
    public zsMapStateService: ZsMapStateService,
    public session: SessionService,
    private datePipe: DatePipe,
    private _router: Router,
  ) {
    this.historyMode = this.zsMapStateService.observeDisplayState().pipe(
      map((displayState) => displayState.displayMode === ZsMapDisplayMode.HISTORY),
      takeUntil(this._ngUnsubscribe),
    );

    this.zsMapStateService
      .observeDisplayState()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((mode) => {
        window.history.pushState(null, '', '?mode=' + mode.displayMode);
      });

    if (this.isInitialLaunch()) {
      this.dialog.open(HelpComponent, {
        data: true,
      });
    }

    this.zsMapStateService
      .observeDrawElements()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((elements: ZsMapBaseDrawElement[]) => {
        this.protocolEntries = mapProtocolEntry(
          elements,
          this.datePipe,
          this.i18n,
          this.session.getLocale() === undefined ? 'de' : this.session.getLocale(),
        );
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
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

  toggleHistory(): void {
    this.zsMapStateService.toggleDisplayMode();
  }

  help(): void {
    this.dialog.open(HelpComponent, { data: false });
  }

  protocolTable(): void {
    this.dialog.open(ProtocolTableComponent, { data: false });
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

  toggleHistoryIfButton(event: MouseEvent) {
    const element = event.target as HTMLElement;
    if (element.id === 'historyButton') {
      this.toggleHistory();
    }
    event.stopPropagation();
  }

  async navigateEvents() {
    await this._router.navigateByUrl('/operations');
  }
}
