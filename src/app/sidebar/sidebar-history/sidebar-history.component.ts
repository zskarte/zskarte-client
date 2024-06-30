import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, startWith, switchMap, tap } from 'rxjs';
import { ApiService } from 'src/app/api/api.service';
import { StrapiApiResponseList } from 'src/app/helper/strapi-utils';
import { SessionService } from 'src/app/session/session.service';
import { I18NService } from 'src/app/state/i18n.service';
import { ZsMapStateService } from 'src/app/state/state.service';

type Snapshot = {
  id: number;
  attributes: {
    createdAt: Date;
  };
};
type Snapshots = StrapiApiResponseList<Snapshot[]>;

@Component({
  selector: 'app-sidebar-history',
  templateUrl: './sidebar-history.component.html',
  styleUrls: ['./sidebar-history.component.scss'],
})
export class SidebarHistoryComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  snapshots$?: Observable<Snapshots>;
  resultSize?: number;
  apiPath = '/api/map-snapshots';

  constructor(
    public i18n: I18NService,
    private apiService: ApiService,
    private sessionService: SessionService,
    private stateService: ZsMapStateService,
    private snackBarService: MatSnackBar,
  ) {}

  ngAfterViewInit() {
    this.snapshots$ = this.paginator.page.pipe(
      startWith({ pageIndex: 0 }),
      switchMap((p) => this.loadData(p.pageIndex + 1)),
      tap((r) => {
        this.resultSize = r.meta.pagination.total;
      }),
    );
  }

  loadData(page: number) {
    const operationId = this.sessionService.getOperationId();
    return this.apiService.get$<Snapshots>(
      `${this.apiPath}?fields[0]=createdAt&operationId=${operationId}&sort[0]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=20`,
    );
  }

  async setHistory(snapshot: Snapshot) {
    const { result } = await this.apiService.get(`${this.apiPath}/${snapshot.id}`);

    this.stateService.setMapState(result.mapState);

    this.snackBarService.open(`${this.i18n.get('toastSnapshotApplied')}: ${snapshot.attributes.createdAt.toLocaleString()}`, 'OK', {
      duration: 2000,
    });
  }

  setCurrent() {
    this.stateService.refreshMapState();
  }
}
