import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getResponsiveImageSource } from 'src/app/helper/strapi-utils';
import { ApiService } from '../../api/api.service';
import { IZsMapOrganization } from '../operations/operation.interfaces';
import { IZso } from '../session.interfaces';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  public selectedOrganization?: IZso = undefined;
  public password = '';
  public organizations = new BehaviorSubject<IZso[]>([]);

  constructor(public session: SessionService, private _api: ApiService) {}

  async ngOnInit() {
    const { error, result } = await this._api.get<IZsMapOrganization[]>(
      '/api/organizations?fields[0]=name&populate[users][fields][0]=username&populate[users][fields][1]=email&populate[logo]=*&pagination[limit]=-1&sort[0]=name',
    );
    if (error || !result) return;
    const orgs: IZso[] = [];
    for (const org of result) {
      if (org.users?.length > 0 && org.users[0]?.username) {
        const responsiveImageSource = getResponsiveImageSource(org.logo);
        const newOrg: IZso = {
          name: org.name,
          identifier: org.users[0]?.username,
          logoSrc: responsiveImageSource?.src,
          logoSrcSet: responsiveImageSource?.srcSet,
        };
        orgs.push(newOrg);
        if (this.selectedOrganization) continue;
        if (newOrg.identifier === 'zso_guest') this.selectedOrganization = newOrg;
      }
      this.organizations.next(orgs);
    }
  }

  public login(): void {
    this.session.login({ identifier: this.selectedOrganization?.identifier || '', password: this.password });
  }
}
