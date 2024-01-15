import { Component, Input, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { Sign } from '../core/entity/sign';
import { DrawStyle } from '../map-renderer/draw-style';
import { ZsMapDrawElementState } from 'src/app/state/interfaces';
import { DrawingDialogComponent } from '../drawing-dialog/drawing-dialog.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-recently-used-signs',
  templateUrl: './recently-used-signs.component.html',
  styleUrls: ['./recently-used-signs.component.css'],
})
export class RecentlyUsedSignsComponent implements OnInit, OnDestroy {
  private _ngUnsubscribe = new Subject<void>();
  constructor(
    public i18n: I18NService,
    private sharedState: ZsMapStateService,
  ) {}

  ngOnInit() {
    this.sharedState
      .observableRecentlyUsedElement()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((elements: ZsMapDrawElementState[]) => {
        // const ids = elements.map((e) => e.symbolId);
        const tmp: Sign[] = [];

        for (const e of elements) {
          const sign = this.dialog.allSigns.find((s) => s.id === e.symbolId);
          if (sign) {
            tmp.push(sign);
          }
        }
        this.signsSource = tmp;
        // this.signsSource = this.dialog.allSigns.filter((s) => ids.includes(s.id));
      });
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  @Input() dialog!: DrawingDialogComponent;
  @Output() selectSign: EventEmitter<Sign> = new EventEmitter<Sign>();

  private signsSource: Sign[] = [];

  get signs(): Sign[] {
    return this.signsSource;
  }

  doSelectSign(sign: Sign) {
    this.selectSign.emit(sign);
  }

  getImageUrl(file: string) {
    if (file) {
      return DrawStyle.getImageUrl(file);
    }
    return null;
  }
}
