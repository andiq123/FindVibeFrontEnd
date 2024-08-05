import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WakeService {
  private baseApi = environment.API_URL + '/api';
  constructor(private httpClient: HttpClient) {}

  wakeServer(): Observable<void> {
    return this.httpClient.get<void>(this.baseApi + '/wake');
  }
}
