import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoutePaths } from 'app/shared/constants/route-paths'; // main module 6125 (export Q)
import { AttendanceComponent } from './attendance.component';

/**
 * Lazy-loaded from the app routes (main.js):
 *   { path: RoutePaths.ATTENDANCE,   // 'attendance-report'
 *     loadChildren: () => import('./views/attendance/attendance.module').then(m => m.AttendanceModule) }
 * (child of the AdminLayout route guarded by AuthGuard; no route `data`).
 *
 * NOTE: AttendanceComponent has no <router-outlet>, so the child routes below never render anything
 * extra; they only make `/attendance-report` and `/attendance-report/attendance-report` resolve.
 */
const routes: Routes = [
  {
    path: '',
    component: AttendanceComponent,
    children: [
      { path: '', component: AttendanceComponent },
      { path: RoutePaths.ATTENDANCE, component: AttendanceComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendanceRoutingModule {}
