import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WakeService {
  private readonly httpClient = inject(HttpClient);
  private readonly healthUrl = `${environment.API_URL}/health`;

  wakeServer(): Observable<void> {
    return this.httpClient.get<void>(this.healthUrl);
  }
}
