import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ZsMapStateService } from 'src/app/state/state.service';
import { mapProtocolEntry, ProtocolEntry } from '../helper/mapProtocolEntry';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { SessionService } from '../session/session.service';
import { I18NService } from '../state/i18n.service';

@Component({
  selector: 'app-protocol-table',
  templateUrl: './protocol-table.component.html',
  styleUrls: ['./protocol-table.component.scss'],
})
export class ProtocolTableComponent implements OnInit, OnDestroy {
  private _ngUnsubscribe = new Subject<void>();
  constructor(
    public zsMapStateService: ZsMapStateService,
    public i18n: I18NService,
    private datePipe: DatePipe,
    private session: SessionService,
  ) {}

  ngOnInit(): void {
    this.zsMapStateService
      .observeDrawElements()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((elements: ZsMapBaseDrawElement[]) => {
        this.data = mapProtocolEntry(elements, this.datePipe, this.i18n, this.session.getLocale());
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public data: ProtocolEntry[] = [];
  currentLang?: string;

  displayedColumns: string[] = [
    //'protocol-id',
    'protocol-date',
    'protocol-group',
    'protocol-sign',
    //'protocol-location',
    //'protocol-size',
    'protocol-label',
    'protocol-description',
  ];
}
