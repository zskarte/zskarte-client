import { Component } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService } from '../session/session.service';

@Component({
  selector: 'app-clock',
  templateUrl: './clock.component.html',
  styleUrls: ['./clock.component.scss'],
})
export class ClockComponent {
  public now: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    public i18n: I18NService,
    public zsMapStateService: ZsMapStateService,
    public session: SessionService,
  ) {
    interval(1000)
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(() => {
        this.now.next(new Date());
      });
  }
}
