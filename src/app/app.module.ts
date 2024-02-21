import { APP_INITIALIZER, LOCALE_ID, NgModule, isDevMode } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { MapRendererComponent } from './map-renderer/map-renderer.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SidebarComponent } from './sidebar/sidebar/sidebar.component';
import { HttpClientModule } from '@angular/common/http';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MapLegendDisplayComponent } from './sidebar/map-legend-display/map-legend-display.component';
import { HelpComponent } from './help/help.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { GeocoderComponent } from './geocoder/geocoder.component';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { SelectSignDialog } from './select-sign-dialog/select-sign-dialog.component';
import { TextDialogComponent } from './text-dialog/text-dialog.component';
import { CreditsComponent } from './credits/credits.component';
import { SelectedFeatureComponent } from './selected-feature/selected-feature.component';
import { DetailImageViewComponent } from './detail-image-view/detail-image-view.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { EditCoordinatesComponent } from './edit-coordinates/edit-coordinates.component';
import { SidebarFiltersComponent } from './sidebar/sidebar-filters/sidebar-filters.component';
import { SessionService } from './session/session.service';

import { registerLocaleData, DatePipe } from '@angular/common';
import localeCH from '@angular/common/locales/de-CH';
import { LoginComponent } from './session/login/login.component';
import { MapComponent } from './map/map.component';
import { AppRoutingModule } from './app-routing.module';
import { RecentlyUsedSignsComponent } from './recently-used-signs/recently-used-signs.component';
import { OperationsComponent } from './session/operations/operations.component';
import { StackComponent } from './stack/stack.component';
import { ProtocolTableComponent } from './protocol-table/protocol-table.component';
import { MatSortModule } from '@angular/material/sort';
import { SyncService } from './sync/sync.service';
import { ZsMapStateService } from './state/state.service';
import { ApiService } from './api/api.service';
import { ShareComponent } from './session/share/share.component';
import { SidebarConnectionsComponent } from './sidebar/sidebar-connections/sidebar-connections.component';
import { ShareDialogComponent } from './session/share-dialog/share-dialog.component';
import { TextDividerComponent } from './text-divider/text-divider.component';
import { RevokeShareDialogComponent } from './session/revoke-share-dialog/revoke-share-dialog.component';
import { SidebarHistoryComponent } from './sidebar/sidebar-history/sidebar-history.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { FloatingUIComponent } from './floating-ui/floating-ui.component';
import { CoordinatesComponent } from './coordinates/coordinates.component';
import { SidebarMenuComponent } from './sidebar/sidebar-menu/sidebar-menu.component';
import { DrawDialogComponent } from './draw-dialog/draw-dialog.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IncidentSelectComponent } from './incident-select/incident-select.component';
import { ProjectionSelectionComponent } from './projection-selection/projection-selection.component';

registerLocaleData(localeCH);

export function appFactory(session: SessionService, sync: SyncService, state: ZsMapStateService, api: ApiService) {
  return async () => {
    // "inject" services to prevent circular dependencies
    session.setStateService(state);
    sync.setStateService(state);
    api.setSessionService(session);

    if (!window.location.pathname.startsWith('/share/')) {
      await session.loadSavedSession();
    }
  };
}
@NgModule({
  declarations: [
    AppComponent,
    MapRendererComponent,
    HelpComponent,
    ConfirmationDialogComponent,
    GeocoderComponent,
    ImportDialogComponent,
    // sidebar
    SidebarComponent,
    SidebarFiltersComponent,
    SidebarConnectionsComponent,
    SidebarHistoryComponent,
    MapLegendDisplayComponent,
    SelectSignDialog,
    TextDialogComponent,
    CreditsComponent,
    SelectedFeatureComponent,
    DetailImageViewComponent,
    EditCoordinatesComponent,
    RevokeShareDialogComponent,
    LoginComponent,
    MapComponent,
    OperationsComponent,
    RecentlyUsedSignsComponent,
    StackComponent,
    ProtocolTableComponent,
    ShareComponent,
    ShareDialogComponent,
    TextDividerComponent,
    FloatingUIComponent,
    CoordinatesComponent,
    SidebarMenuComponent,
    DrawDialogComponent,
    IncidentSelectComponent,
    ProjectionSelectionComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
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
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'de-CH' },
    {
      provide: APP_INITIALIZER,
      useFactory: appFactory,
      deps: [SessionService, SyncService, ZsMapStateService, ApiService],
      multi: true,
    },
    DatePipe,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {} //skipcq: JS-0327
