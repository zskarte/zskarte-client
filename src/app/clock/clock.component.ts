import { Component } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { SessionService } from '../session/session.service';

@Component({
  selector: 'app-clock',
  templateUrl: './clock.component.html',
  styleUrls: ['./clock.component.scss'],
})
export class ClockComponent {
  private _durationInSeconds = 1 * 60 * 60;
  public now: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  public timerProgress = new BehaviorSubject({ percentage: 1000, text: '60:00' });
  private _ngUnsubscribe = new Subject();

  constructor(public i18n: I18NService, public zsMapStateService: ZsMapStateService, public session: SessionService) {
    interval(1000)
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(() => {
        this.now.next(new Date());
      });

    // TODO move to session
    interval(1000)
      .pipe(
        take(this._durationInSeconds),
        map((count) => this._durationInSeconds - count),
        takeUntil(this._ngUnsubscribe),
      )
      .subscribe({
        next: (countdown) => {
          const mins = (~~((countdown % 3600) / 60)).toString();
          const secs = (~~countdown % 60).toString();
          this.timerProgress.next({
            percentage: (100 / this._durationInSeconds) * countdown,
            text: `${mins.padStart(2, '0')}:${secs.padStart(2, '0')}`,
          });
          return `${mins.padStart(2, '0')}:${secs.padStart(2, '0')}`;
        },
        complete: () => {
          // TODO logout
          console.warn('TODO logout');
        },
      });
  }
}
