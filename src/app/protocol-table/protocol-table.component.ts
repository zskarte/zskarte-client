import { DatePipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ZsMapStateService } from 'src/app/state/state.service';
import { mapProtocolEntry, ProtocolEntry } from '../helper/protocolEntry';
import { ZsMapBaseDrawElement } from '../map-renderer/elements/base/base-draw-element';
import { SessionService } from '../session/session.service';
import { I18NService } from '../state/i18n.service';
import { getCenter } from 'ol/extent';
import { ChangeType } from '../projection-selection/projection-selection.component';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-protocol-table',
  templateUrl: './protocol-table.component.html',
  styleUrls: ['./protocol-table.component.scss'],
})
export class ProtocolTableComponent implements OnInit, OnDestroy, AfterViewInit {
  private _ngUnsubscribe = new Subject<void>();
  projectionFormatIndex = 0;
  numerical = false;

  constructor(
    public zsMapStateService: ZsMapStateService,
    public i18n: I18NService,
    private datePipe: DatePipe,
    private session: SessionService,
  ) {}

  @ViewChild(MatSort) sort?: MatSort;

  ngOnInit(): void {
    this.zsMapStateService.observeDrawElements().pipe(takeUntil(this._ngUnsubscribe)).subscribe(this.updateTable.bind(this));
  }

  ngAfterViewInit() {
    if (this.protocolTableDataSource && this.sort) {
      this.protocolTableDataSource.sort = this.sort;
    }
  }

  updateTable(elements: ZsMapBaseDrawElement[]) {
    this.data = mapProtocolEntry(elements, this.datePipe, this.i18n, this.session.getLocale(), this.projectionFormatIndex, this.numerical);
    this.protocolTableDataSource.data = this.data;
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  updateProjection(value: ChangeType) {
    this.projectionFormatIndex = value.projectionFormatIndex ?? this.projectionFormatIndex;
    this.numerical = value.numerical ?? this.numerical;
    this.zsMapStateService.observeDrawElements().pipe(first()).subscribe(this.updateTable.bind(this));
  }

  public data: ProtocolEntry[] = [];

  public protocolTableDataSource = new MatTableDataSource([] as ProtocolEntry[]);

  displayedColumns: string[] = [
    //'id',
    'date',
    'group',
    'sign',
    //'location',
    'centroid',
    //'size',
    'label',
    'description',
  ];

  navigateTo(element: ProtocolEntry) {
    const extent = this.zsMapStateService.getDrawElemente(element.id)?.getOlFeature()?.getGeometry()?.getExtent();
    if (extent) {
      this.zsMapStateService.setMapCenter(getCenter(extent));
    }
  }
}
