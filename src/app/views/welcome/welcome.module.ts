// Reconstructed from chunk 464.653de154a2bb2d2e.js (class `f`, exported as WelcomeModule).
// ɵinj imports: [CommonModule, SharedMaterialModule, RouterModule.forChild(routes)]
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedMaterialModule } from 'app/shared/shared-material.module'; // main 5772 (m)

import { WelcomeComponent } from './welcome.component';
import { WelcomeRoutes } from './welcome.routing';

@NgModule({
  declarations: [WelcomeComponent],
  imports: [CommonModule, SharedMaterialModule, RouterModule.forChild(WelcomeRoutes)],
})
export class WelcomeModule {}
