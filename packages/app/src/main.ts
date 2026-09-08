import {
  enableProdMode,
  LOCALE_ID,
  isDevMode,
  importProvidersFrom,
  provideAppInitializer,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { enablePatches } from 'immer';
import { appFactory } from './app/app-factory';
import { environment } from './environments/environment';
import { SessionService } from './app/session/session.service';
import { SyncService } from './app/sync/sync.service';
import { ZsMapStateService } from './app/state/state.service';
import { ApiService } from './app/api/api.service';
import { DatePipe } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app/app-routes';
import { JournalService } from './app/journal/journal.service';
import { SearchService } from './app/search/search.service';
import { OperationService } from './app/session/operations/operation.service';
import { ChangesetService } from './app/changeset/changeset.service';
import { SidebarService } from './app/sidebar/sidebar.service';
import { ResourceService } from './app/resource/resource.service';

// enable immerjs patches
enablePatches();

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      MatAutocompleteModule,
      FormsModule,
      ReactiveFormsModule,
      OverlayModule,
      MatProgressSpinnerModule,
      MatCheckboxModule,
      MatBadgeModule,
      MatExpansionModule,
      MatSlideToggleModule,
      MatStepperModule,
      MatIconModule,
      MatSidenavModule,
      MatGridListModule,
      MatSnackBarModule,
      MatToolbarModule,
      MatTooltipModule,
      MatButtonModule,
      MatSelectModule,
      MatCardModule,
      MatTabsModule,
      MatMenuModule,
      MatDialogModule,
      MatInputModule,
      MatSliderModule,
      MatTableModule,
      MatRadioModule,
      MatListModule,
      MatFormFieldModule,
      MatInputModule,
      MatSortModule,
      MatPaginatorModule,
      MatProgressBarModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000',
      }),
    ),
    { provide: LOCALE_ID, useValue: 'de-CH' },
    provideAppInitializer(() => {
      const initializerFn = appFactory(
        inject(SessionService),
        inject(SyncService),
        inject(ZsMapStateService),
        inject(ApiService),
        inject(JournalService),
        inject(SearchService),
        inject(OperationService),
        inject(ChangesetService),
        inject(SidebarService),
        inject(ResourceService),
      );
      return initializerFn();
    }),

    DatePipe,
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideRouter(appRoutes),
    provideZoneChangeDetection(),
  ],
}).catch((err) => console.error(err));
