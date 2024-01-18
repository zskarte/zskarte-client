import { Component } from '@angular/core';
import { I18NService } from 'src/app/state/i18n.service';
import { IZsAccess } from '../session.interfaces';
import { ApiService } from 'src/app/api/api.service';
import { SessionService } from '../session.service';

@Component({
  selector: 'app-revoke-share-dialog',
  templateUrl: './revoke-share-dialog.component.html',
  styleUrl: './revoke-share-dialog.component.scss',
})
export class RevokeShareDialogComponent {
  shareLinks: IZsAccess[] = [];
  displayedColumns: string[] = ['createdAt', 'type', 'expiresOn', 'actions'];

  constructor(
    public i18n: I18NService,
    private _api: ApiService,
    private session: SessionService,
  ) {}

  async ngOnInit() {
    const { error, result } = await this._api.get<IZsAccess[]>(
      '/api/accesses?&pagination[limit]=-1&sort[0]=type&operationId=' + this.session.getOperationId(),
    );
    if (error || !result) return;
    this.shareLinks = result;
  }

  async revokeShareLink(id: string) {
    const { error, result } = await this._api.delete<IZsAccess>('/api/accesses/' + id);
    if (error || !result) return;
    this.shareLinks = this.shareLinks.filter((l) => l.id !== id);
  }
}
