// Source: route array `js` inlined into main.0ad03de76494ddf1.js webpack module 6250 (entry);
// RouterModule.forRoot(rootRouterConfig, { useHash: false }).
//
// Lazy chunk map (webpack chunk ids -> module id -> NgModule):
//   sessions             882            -> 9882 SessionsModule
//   home                 464            -> 8464 WelcomeModule
//   search               146            -> 5146 SearchViewModule
//   customers-list       482            -> 2482 CustomersListModule
//   salesperson-planning 592(common)+35 -> 8035 SalesPersonPlanningModule
//   task-report          574(xlsx)+592+704 -> 5704 TasksListModule
//   task-details         574+592+704    -> 5704 TasksListModule (same module loaded under a second path)
//   interaction-list     574+592+374    -> 6457 InteractionListModule
//   salesperson-list     592+195        -> 7195 SalespersonModule
//   attendance-report    574+592+205    -> 205  AttendanceModule
//   performance          574+41         -> 2041 PerformanceModule
// Only `sessions`, `home`, `salesperson-planning` and `task-report` carry route `data` here.
// There is no wildcard ('**') route.
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './shared/components/layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './shared/components/layouts/auth-layout/auth-layout.component';
import { RoutePaths } from './shared/constants/route-paths';
import { AuthGuard } from './shared/guards/auth.guard';

export const rootRouterConfig: Routes = [
  {
    path: '',
    redirectTo: '/sessions/signin',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'sessions',
        loadChildren: () => import('./views/sessions/sessions.module').then((m) => m.SessionsModule),
        data: { title: 'Session' },
      },
    ],
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: RoutePaths.WELCOME,
        loadChildren: () => import('./views/welcome/welcome.module').then((m) => m.WelcomeModule),
        data: { title: RoutePaths.WELCOME, breadcrumb: RoutePaths.WELCOME },
      },
      {
        path: RoutePaths.SEARCH,
        loadChildren: () => import('./views/search-view/search-view.module').then((m) => m.SearchViewModule),
      },
      {
        path: RoutePaths.CUSTOMER_LIST,
        loadChildren: () => import('./views/customers-list/customers-list.module').then((m) => m.CustomersListModule),
      },
      {
        path: RoutePaths.SALESPERSON_PLANNING,
        loadChildren: () =>
          import('./views/sales-person-planning/sales-person-planning.module').then((m) => m.SalesPersonPlanningModule),
        data: { title: RoutePaths.SALESPERSON_PLANNING, breadcrumb: RoutePaths.SALESPERSON_PLANNING },
      },
      {
        // Not in the original app.
        path: RoutePaths.RESCHEDULE_TASKS,
        loadChildren: () => import('./views/reschedule-tasks/reschedule-tasks.module').then((m) => m.RescheduleTasksModule),
        data: { title: RoutePaths.RESCHEDULE_TASKS, breadcrumb: RoutePaths.RESCHEDULE_TASKS },
      },
      {
        path: RoutePaths.TASKS,
        loadChildren: () => import('./views/tasks/tasks.module').then((m) => m.TasksListModule),
        data: { title: RoutePaths.TASKS, breadcrumb: RoutePaths.TASKS },
      },
      {
        path: RoutePaths.TASK_DETAILS,
        loadChildren: () => import('./views/tasks/tasks.module').then((m) => m.TasksListModule),
      },
      {
        path: RoutePaths.INTERACTION_LIST,
        loadChildren: () => import('./views/interactions/interaction-list.module').then((m) => m.InteractionListModule),
      },
      {
        path: RoutePaths.SALESPERSON_LIST,
        loadChildren: () => import('./views/salesperson/salesperson.module').then((m) => m.SalespersonModule),
      },
      {
        path: RoutePaths.ATTENDANCE,
        loadChildren: () => import('./views/attendance/attendance.module').then((m) => m.AttendanceModule),
      },
      {
        path: RoutePaths.PERFORMANCE_REPORT,
        loadChildren: () => import('./views/performance/performance.module').then((m) => m.PerformanceModule),
      },
    ],
  },
];
