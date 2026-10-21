import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoutePaths } from 'app/shared/constants/route-paths'; // main module 6125 (export Q)
import { MtdPerformanceReportComponent } from './mtd-performance-report/mtd-performance-report.component';

/**
 * Lazy-loaded from the app routes (main.js):
 *   { path: RoutePaths.PERFORMANCE_REPORT,   // 'performance'
 *     loadChildren: () => import('./views/performance/performance.module').then(m => m.PerformanceModule) }
 * (child of the AdminLayout route guarded by AuthGuard; no route `data`).
 *
 * NOTE: the component has no <router-outlet>; the children only make `/performance` and
 * `/performance/performance` resolve.
 */
const routes: Routes = [
  {
    path: '',
    component: MtdPerformanceReportComponent,
    children: [
      { path: '', component: MtdPerformanceReportComponent },
      { path: RoutePaths.PERFORMANCE_REPORT, component: MtdPerformanceReportComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PerformanceRoutingModule {}
