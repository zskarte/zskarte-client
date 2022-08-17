import { Component } from '@angular/core';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  public identifier = '';
  public password = '';

  constructor(private _session: SessionService) {}

  ngOnInit() {
    this.identifier = '';
    this.password = '';
  }

  login() {
    this._session.login({ identifier: this.identifier, password: this.password });
  }
}
