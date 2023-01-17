import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
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
import {MatToolbarModule} from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MapLegendDisplayComponent } from './sidebar/map-legend-display/map-legend-display.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { HelpComponent } from './help/help.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { GeocoderComponent } from './geocoder/geocoder.component';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { ClockComponent } from './clock/clock.component';
import { FabMenuComponent } from './fab-menu/fab-menu.component';
import { DrawingDialogComponent } from './drawing-dialog/drawing-dialog.component';
import { TextDialogComponent } from './text-dialog/text-dialog.component';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { CreditsComponent } from './credits/credits.component';
import { SelectedFeatureComponent } from './selected-feature/selected-feature.component';
import { DetailImageViewComponent } from './detail-image-view/detail-image-view.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { EditCoordinatesComponent } from './edit-coordinates/edit-coordinates.component';
import { SidebarFiltersComponent } from './sidebar/sidebar-filters/sidebar-filters.component';
import { SessionService } from './session/session.service';

import { registerLocaleData } from '@angular/common';
import { DatePipe } from '@angular/common';
import localeCH from '@angular/common/locales/de-CH';
import { LoginComponent } from './session/login/login.component';
import { MapComponent } from './map/map.component';
import { AppRoutingModule } from './app-routing.module';
import { RecentlyUsedSignsComponent } from './recently-used-signs/recently-used-signs.component';
import { OperationsComponent } from './session/operations/operations.component';
import { StackComponent } from './stack/stack.component';
import { ProtocolTableComponent } from './protocol-table/protocol-table.component';

registerLocaleData(localeCH);

export function appFactory(session: SessionService) {
  return async () => {
    await session.loadSavedSession();
  };
}
@NgModule({
  declarations: [
    AppComponent,
    MapRendererComponent,
    ToolbarComponent,
    HelpComponent,
    ConfirmationDialogComponent,
    GeocoderComponent,
    ImportDialogComponent,
    ClockComponent,
    // sidebar
    SidebarComponent,
    SidebarFiltersComponent,
    MapLegendDisplayComponent,
    FabMenuComponent,
    DrawingDialogComponent,
    TextDialogComponent,
    ExportDialogComponent,
    CreditsComponent,
    SelectedFeatureComponent,
    DetailImageViewComponent,
    EditCoordinatesComponent,
    LoginComponent,
    MapComponent,
    OperationsComponent,
    RecentlyUsedSignsComponent,
    StackComponent,
    ProtocolTableComponent,
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
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'de-CH' },
    {
      provide: APP_INITIALIZER,
      useFactory: appFactory,
      deps: [SessionService],
      multi: true,
    },
    DatePipe,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
