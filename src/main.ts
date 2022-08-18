import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enablePatches } from 'immer';

import { AppModule } from './app/app.module';
import { initDb } from './app/db/db';
import { environment } from './environments/environment';

// enable immerjs patches
enablePatches();

// initialize db
initDb();

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
