// Reconstructed from chunk 146.9273cda643bc5f94.js (const `p`, module class `h`).
// Mounted by the app router at RoutePaths.SEARCH ("search") under AdminLayoutComponent, canActivate: [AuthGuard].
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultPageComponent } from './result-page/result-page.component';

const routes: Routes = [{ path: '', component: ResultPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SearchViewRoutingModule {}
