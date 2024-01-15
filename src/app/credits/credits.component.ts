import { Component } from '@angular/core';
import { I18NService } from '../state/i18n.service';
import { SessionService } from '../session/session.service';

@Component({
  selector: 'app-credits',
  templateUrl: './credits.component.html',
  styleUrls: ['./credits.component.css'],
})
export class CreditsComponent {
  public operationName = '';
  public logo = '';

  constructor(public i18n: I18NService, public session: SessionService) {
    this.operationName = session.getOperationName() ?? '';
    this.logo = session.getLogo() ?? '';
  }
}
