import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '../../../shared/services/config.service';
import { MessageQueueRequest } from '../models/sales-person-planning.models';

/**
 * Minified as `Xu` in chunk 35 (only defined here). Injected as `messageQueueService` (areas tab, preview dialog)
 * and as `backendService` (sales person tab, select-area dialog).
 *
 * POST `${config.messagingServiceUrl}` with `{ messageType, input: JSON.stringify(payload) }`.
 * The backend consumes these messages asynchronously (the UI tells the user to wait 5-15 minutes).
 */
@Injectable({
  providedIn: 'root',
})
export class MessageQueueService {
  baseUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.baseUrl = `${this.configService.getConfig().messagingServiceUrl}`;
  }

  async postMessageToQueue(message: MessageQueueRequest | any = {}): Promise<any> {
    try {
      const request$ = this.http.post(this.baseUrl, message);
      return await firstValueFrom(request$);
    } catch (error) {
      throw error;
    }
  }
}
