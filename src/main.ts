// Source: tail of main.0ad03de76494ddf1.js webpack module 6250: `platformBrowser().bootstrapModule(AppModule)
// .catch(err => console.log(err))` (the CLI swaps platformBrowserDynamic for platformBrowser in AOT builds).
// No enableProdMode() call survives in the bundle.
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.log(err));
