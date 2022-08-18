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
  public organization = '';
  public identifier = '';
  public password = '';
  public organizations = new BehaviorSubject<IZso[]>([]);
  public filteredOrganizations = new BehaviorSubject<IZso[]>([]);

  constructor(private _session: SessionService, private _api: ApiService) {}

  async ngOnInit() {
    this.identifier = '';
    this.password = '';
    const result = await this._api.get(
      '/api/organizations?fields[0]=name&populate[users][fields][0]=username&populate[users][fields][1]=email',
    );

    const orgs: IZso[] = [];
    for (const org of result.data) {
      if (org.attributes?.users?.data?.length > 0 && org.attributes.users.data[0].attributes?.username) {
        orgs.push({ name: org.attributes.name, identifier: org.attributes.users.data[0].attributes?.username });
      }
      this.organizations.next(orgs);
      this.filteredOrganizations.next(orgs);
    }
  }

  public login(): void {
    this._session.login({ identifier: this.identifier, password: this.password });
  }

  public organizationSelected(org: IZso): void {
    this.identifier = org?.identifier;
    this.organization = org?.name;
  }

  public filterOrganizations(filter: string): void {
    if (!filter) {
      this.filteredOrganizations.next(this.organizations.value);
      this.organization = '';
      this.identifier = '';
      return;
    } else {
      this.filteredOrganizations.next(this.organizations.value.filter((org) => org.name?.toLowerCase().includes(filter?.toLowerCase())));
    }
  }
}
