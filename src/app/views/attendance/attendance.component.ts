import { Component } from '@angular/core';

/**
 * Attendance shell page (route `attendance-report`).
 * Three tabs; each tab's content is only instantiated while that tab is selected
 * (`*ngIf` on the selected index), so every tab re-initialises (and re-fetches) when re-opened.
 */
@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss'],
})
export class AttendanceComponent {
  selectedTabIndex = 0;

  constructor() {}
}
