import { Component } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { ZsMapStateService } from '../state/state.service';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { SessionService } from '../session/session.service';

interface TimerProgress {
  percentage: number;
  text: string;
}

@Component({
  selector: 'app-clock',
  templateUrl: './clock.component.html',
  styleUrls: ['./clock.component.scss'],
})
export class ClockComponent {
  private _durationInSeconds = 1 * 60 * 60;
  public now: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date());
  public timerProgress = new BehaviorSubject<TimerProgress | undefined>(undefined);
  private _ngUnsubscribe = new Subject<void>();

  constructor(public i18n: I18NService, public zsMapStateService: ZsMapStateService, public session: SessionService) {
    interval(1000)
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(() => {
        this.now.next(new Date());
      });

    const guestLoginDateTime = this.session.getGuestLoginDateTime();

    if (guestLoginDateTime) {
      interval(1000)
        .pipe(
          takeUntil(this._ngUnsubscribe),
        )
        .subscribe({
          next: () => {
            const countdown = this._durationInSeconds - Math.abs(new Date().getTime() - guestLoginDateTime.getTime()) / 1000;
            if(countdown < 0) {
              this._ngUnsubscribe.next();
            }
            const mins = (~~((countdown % 3600) / 60)).toString();
            const secs = (~~countdown % 60).toString();
            this.timerProgress.next({
              percentage: (100 / this._durationInSeconds) * countdown,
              text: `${mins.padStart(2, '0')}:${secs.padStart(2, '0')}`,
            });
            return `${mins.padStart(2, '0')}:${secs.padStart(2, '0')}`;
          },
          complete: async () => {
            await this.session.logout();
          },
        });
    } else {
      this.timerProgress.next(undefined);
    }
  }
}
