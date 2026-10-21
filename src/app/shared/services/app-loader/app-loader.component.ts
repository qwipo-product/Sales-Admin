// Source: main.0ad03de76494ddf1.js webpack module 33 (export `d`) – selector app-app-loader.
// Opened only through AppLoaderService.open(); declared in SharedComponentsModule.
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-app-loader',
  templateUrl: './app-loader.component.html',
  styleUrls: ['./app-loader.component.scss'],
})
export class AppLoaderComponent implements OnInit {
  title!: string;
  message!: string;

  constructor(public dialogRef: MatDialogRef<AppLoaderComponent>) {}

  ngOnInit() {}
}
