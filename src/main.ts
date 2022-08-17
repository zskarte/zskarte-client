import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enablePatches } from 'immer';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// enable immerjs patches
enablePatches();

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
