import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from '../../api/api.service';
import { IZso } from '../session.interfaces';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  public identifier = '';
  public password = '';
  public organizations = new BehaviorSubject<IZso[]>([]);

  constructor(private _session: SessionService, private _api: ApiService) {}

  async ngOnInit() {
    const result = await this._api.get(
      '/api/organizations?fields[0]=name&populate[users][fields][0]=username&populate[users][fields][1]=email&pagination[limit]=-1&sort[0]=name',
    );

    const orgs: IZso[] = [];
    for (const org of result.data) {
      if (org.attributes?.users?.data?.length > 0 && org.attributes.users.data[0].attributes?.username) {
        orgs.push({ name: org.attributes.name, identifier: org.attributes.users.data[0].attributes?.username });
      }
      this.organizations.next(orgs);
    }
  }

  public login(): void {
    this._session.login({ identifier: this.identifier, password: this.password });
  }
}
