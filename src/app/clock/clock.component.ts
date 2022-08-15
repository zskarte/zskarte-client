import { Component, OnInit } from '@angular/core';
import {I18NService} from "../core/i18n.service";
import {ZsMapStateService} from "../state/state.service";
import {IZsSession} from "../core/entity/session";

@Component({
  selector: 'app-clock',
  templateUrl: './clock.component.html',
  styleUrls: ['./clock.component.css'],
})
export class ClockComponent implements OnInit {
  historyDate: Date | null = null;
  session: IZsSession | null = null;
  timeOffset: number = 3600000; // 1h = 60m = 3600s = 3600000ms
  doCheckTimeout: number = 0;
  sessionTimeLeft: string;
  now: Date;
  timerProgressValue: number = 100;

  constructor(
    public i18n: I18NService,
    public zsMapStateService: ZsMapStateService
  ) {
    /*
    this.sharedState.historyDate.subscribe((s) => {
      this.historyDate = s && s !== 'now' ? new Date(s) : null;
      this.redefine();
    });*/

    this.zsMapStateService.observeSession().subscribe((s) => {
     this.session = s;
      /*
      if (s) {
        const currentZSO = this.preferences.getZSO();
        this.exportEnabled = currentZSO != null && currentZSO.id != 'zso_guest';
        this.preferences.setLastSessionId(s.uuid);
      }*/
    });
  }

  ngOnInit() {
    this.update();
  }

  refreshSessionData() {
    if (this.session === null) {
      return;
    }

    this.doCheckTimeout =
      this.session.zsoId == 'zso_guest' && this.session.start != null
        ? new Date(this.session.start).getTime() + this.timeOffset
        : 0;
    //this.sharedState.sessionOutdated.next(false);
  }

  redefine() {
    this.now = this.historyDate ? this.historyDate : new Date();
    /*
    if (
      this.sessionId != this.preferences.getLastSessionId() ||
      this.sessionZsoId != this.preferences.getLastZsoId()
    ) {
      this.refreshSessionData();
    }*/
    if (this.doCheckTimeout != 0) {
      const sessionSecondsLeft: number = Math.floor(
        (this.doCheckTimeout - this.now.getTime()) / 1000
      );
      this.timerProgressValue = Math.floor((sessionSecondsLeft / 3600) * 100);
      if (sessionSecondsLeft > 0) {
        this.sessionTimeLeft =
          sessionSecondsLeft > 60
            ? Math.floor(sessionSecondsLeft / 60) + 'm'
            : sessionSecondsLeft + 's';
      } else {
        this.sessionTimeLeft = this.i18n.get('sessionOverdue');
        /*if (!this.sharedState.sessionOutdated.value) {
          this.sharedState.sessionOutdated.next(true);
        }*/
      }
    }
  }

  update() {
    this.redefine();
    setTimeout(() => this.update(), 1000);
  }
}
