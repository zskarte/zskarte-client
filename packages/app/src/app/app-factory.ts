import { registerLocaleData } from '@angular/common';
import localeCH from '@angular/common/locales/de-CH';
import { SyncService } from './sync/sync.service';
import { ZsMapStateService } from './state/state.service';
import { ApiService } from './api/api.service';
import { SessionService } from './session/session.service';
import { JournalService } from './journal/journal.service';
import { SearchService } from './search/search.service';
import { OperationService } from './session/operations/operation.service';
import { ChangesetService } from './changeset/changeset.service';
import { SidebarService } from './sidebar/sidebar.service';
import { ResourceService } from './resource/resource.service';

registerLocaleData(localeCH);

export function appFactory(
  session: SessionService,
  sync: SyncService,
  state: ZsMapStateService,
  api: ApiService,
  journal: JournalService,
  search: SearchService,
  operation: OperationService,
  changeset: ChangesetService,
  sidebar: SidebarService,
  resource: ResourceService,
) {
  return async () => {
    // "inject" services to prevent circular dependencies
    session.setStateService(state);
    sync.setStateService(state);
    journal.setStateService(state);
    journal.setSearchService(search);
    api.setSessionService(session);
    operation.setJournalService(journal);
    changeset.setStateService(state);
    changeset.setSidebarService(sidebar);
    changeset.setSessionService(session);
    resource.setStateService(state);

    if (!window.location.pathname.startsWith('/share/')) {
      await session.loadSavedSession();
    }
  };
}
