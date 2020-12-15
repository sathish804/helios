import { Observable, throwError } from 'rxjs';
import { ProviderHttpService } from '../../provider-http.service';
import { catchError, switchMap } from 'rxjs/operators';
import { RealDebridOauthTokenDto } from '../dtos/oauth/real-debrid-oauth-token.dto';
import { WakoHttpError, WakoHttpRequest, WakoHttpService } from '@wako-app/mobile-sdk';

export class RealDebridApiService extends ProviderHttpService {
  static queueEnabled = true;

  static handle401: Observable<RealDebridOauthTokenDto>;

  static getApiBaseUrl() {
    return 'https://api.real-debrid.com/rest/1.0';
  }

  static getHeaders() {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (!!this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    return headers;
  }

  static handleError(err) {
    if (err instanceof WakoHttpError && err.status !== 404 && err.status !== 403) {
      return super.unHandleError(err);
    }
    return throwError(err);
  }

  static request<T>(
    httpRequest: WakoHttpRequest,
    cacheTime?: string | number,
    timeoutMs = 40000,
    byPassCors = false,
    timeToWaitOnTooManyRequest?: number,
    timeToWaitBetweenEachRequest?: number
  ) {
    return super.request<T>(httpRequest, cacheTime, timeoutMs, byPassCors, timeToWaitOnTooManyRequest, timeToWaitBetweenEachRequest).pipe(
      catchError((err) => {
        if (err instanceof WakoHttpError && err.status === 401 && this.handle401) {
          console.log('Refreshing RD');
          return this.handle401.pipe(
            switchMap((credentialsRefreshed) => {
              if (credentialsRefreshed) {
                httpRequest.headers = null;

                return super.request<T>(httpRequest, cacheTime, timeoutMs, true, timeToWaitOnTooManyRequest, timeToWaitBetweenEachRequest);
              }
              return throwError(err);
            })
          );
        }
        return throwError(err);
      })
    );
  }

  static post<T>(url: string, body: Object, cacheTime?: string, timeoutMs?, byPassCors = true) {
    return this.request<T>(
      {
        method: 'POST',
        url: this.getApiBaseUrl() + url,
        body: body,
        headers: this.getHeaders()
      },
      cacheTime,
      timeoutMs ?? 40000,
      byPassCors
    );
  }

  static get<T>(url: string, params?: any, cacheTime?: string | number, timeoutMs?, byPassCors = true): Observable<T> {
    return this.request<T>(
      {
        url: this.getApiBaseUrl() + WakoHttpService.addParamsToUrl(url, params),
        method: 'GET'
      },
      cacheTime,
      timeoutMs ?? 40000,
      byPassCors
    );
  }
}
