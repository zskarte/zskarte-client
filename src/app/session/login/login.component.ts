import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { getResponsiveImageSource } from 'src/app/helper/strapi-utils';
import { ApiService } from '../../api/api.service';
import { IZsMapOrganization } from '../operations/operation.interfaces';
import { IZso } from '../session.interfaces';
import { SessionService } from '../session.service';
import { GUEST_USER_IDENTIFIER, GUEST_USER_PASSWORD } from '../userLogic';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { I18NService } from '../../state/i18n.service';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnDestroy {
  public selectedOrganization?: IZso = undefined;
  public password = '';
  public organizations = new BehaviorSubject<IZso[]>([]);
  public filteredOrganizations = new BehaviorSubject<IZso[]>([]);
  public isLoginWithCodeEnabled = false;
  public joinCode = '';
  public isOnline = true;
  public hasGuestUser = false;
  private _ngUnsubscribe = new Subject<void>();

  constructor(
    public session: SessionService,
    public i18n: I18NService,
    private _api: ApiService,
    private _dialog: MatDialog,
    private router: Router,
  ) {
    this.session
      .observeIsOnline()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((isOnline) => {
        this.isOnline = isOnline;
      });
  }

  async ngOnInit() {
    const { error, result } = await this._api.get<IZsMapOrganization[]>('/api/organizations/forlogin');
    if (error || !result) return;
    const orgs: IZso[] = [];
    for (const org of result) {
      if (org.users?.length > 0 && org.users[0]?.username) {
        if (org.users[0].username === 'zso_guest') {
          this.hasGuestUser = true;
          continue;
        }
        const responsiveImageSource = getResponsiveImageSource(org.logo);
        const newOrg: IZso = {
          name: org.name,
          identifier: org.users[0].username,
          logoSrc: responsiveImageSource?.src,
          logoSrcSet: responsiveImageSource?.srcSet,
        };
        orgs.push(newOrg);
        if (this.selectedOrganization) continue;
      }
      this.organizations.next(orgs);
      this.filteredOrganizations.next(orgs);
    }
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  filterControl = new FormControl();

  filterOrganizations() {
    const currentFiltered = this.organizations.value.filter((option) =>
      option.name.toLowerCase().includes(this.filterControl.value.toLowerCase()),
    );
    if (currentFiltered.length === 0 && this.selectedOrganization) {
      currentFiltered.push(this.selectedOrganization);
    }
    this.filteredOrganizations.next(currentFiltered);
  }

  // skipcq: JS-0105
  public nameProperty(zso: IZso) {
    return zso?.name;
  }

  public onSelectOrg(event: MatAutocompleteSelectedEvent) {
    this.selectedOrganization = event.option.value;
  }

  public onCloseAutocomplete() {
    if (this.selectedOrganization?.name === this.filterControl.value?.name) return;
    if (!this.filterControl.value) return;
    this.filterControl.setValue(this.selectedOrganization);
  }

  public async login(): Promise<void> {
    if (this.isLoginWithCodeEnabled) {
      const joinLink = `share/${this.joinCode}`;
      await this.router.navigateByUrl(joinLink);
    } else {
      await this.session.login({ identifier: this.selectedOrganization?.identifier ?? '', password: this.password });
    }
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

  public workLocal(): void {
    const confirmation = this._dialog.open(ConfirmationDialogComponent, {
      data: this.i18n.get('localNotification'),
    });
    confirmation.afterClosed().subscribe(async (res) => {
      if (res) {
        await this.session.startWorkLocal();
      }
    });
  }
}
