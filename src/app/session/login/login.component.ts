import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getResponsiveImageSource } from 'src/app/helper/strapi-utils';
import { ApiService } from '../../api/api.service';
import { IZsMapOrganization } from '../operations/operation.interfaces';
import { IZso } from '../session.interfaces';
import { SessionService } from '../session.service';
import { GUEST_USER_IDENTIFIER, GUEST_USER_PASSWORD } from '../userLogic';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { I18NService } from '../../state/i18n.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  public selectedOrganization?: IZso = undefined;
  public password = '';
  public organizations = new BehaviorSubject<IZso[]>([]);

  constructor(public session: SessionService, public i18n: I18NService, private _api: ApiService, private _dialog: MatDialog) {}

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
        if (newOrg.identifier === 'zso_guest') {
          continue;
        }
        orgs.push(newOrg);
        if (this.selectedOrganization) continue;
      }
      this.organizations.next(orgs);
    }
  }

  public async login(): Promise<void> {
    await this.session.login({ identifier: this.selectedOrganization?.identifier || '', password: this.password });
  }

  public guestLogin(): void {
    const confirmation = this._dialog.open(ConfirmationDialogComponent, {
      data: this.i18n.get('deletionNotification'),
    });
    confirmation.afterClosed().subscribe(async (res) => {
      if (res) {
        await this.session.login({ identifier: GUEST_USER_IDENTIFIER, password: GUEST_USER_PASSWORD });
      }
    });
  }
}
