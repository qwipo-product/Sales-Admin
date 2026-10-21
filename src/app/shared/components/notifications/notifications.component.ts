// Source: main.0ad03de76494ddf1.js webpack module 3293 (export `t`) – selector app-notifications,
// ViewEncapsulation.None. Rendered inside AdminLayout's end-side <mat-sidenav #notificationPanel>, which no button
// in the shipped header-side opens. Static Egret demo data.
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';

interface INotification {
  message: string;
  icon: string;
  time: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class NotificationsComponent implements OnInit {
  @Input() notificPanel!: MatSidenav;

  // Dummy notifications
  notifications: INotification[] = [
    {
      message: 'New contact added',
      icon: 'assignment_ind',
      time: '1 min ago',
      route: '/inbox',
      color: 'primary',
    },
    {
      message: 'New message',
      icon: 'chat',
      time: '4 min ago',
      route: '/chat',
      color: 'accent',
    },
    {
      message: 'Server rebooted',
      icon: 'settings_backup_restore',
      time: '12 min ago',
      route: '/charts',
      color: 'warn',
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.subscribe((routeChange) => {
      if (routeChange instanceof NavigationEnd) {
        this.notificPanel.close();
      }
    });
  }

  clearAll(e: Event) {
    e.preventDefault();
    this.notifications = [];
  }
}
