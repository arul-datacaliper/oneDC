import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client } from '../../shared/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/clients`;

  getAll() {
    return this.http.get<Client[]>(this.base);
  }

  getById(id: string) {
    return this.http.get<Client>(`${this.base}/${id}`);
  }

  create(client: Partial<Client>) {
    return this.http.post<Client>(this.base, client);
  }

  update(id: string, client: Partial<Client>) {
    return this.http.put<Client>(`${this.base}/${id}`, client);
  }

  checkDependencies(id: string) {
    return this.http.get<{
      canDelete: boolean;
      dependencies: {
        projectCount: number;
        projects: Array<{ projectId: string; name: string; status: string }> | null;
      };
      message: string;
    }>(`${this.base}/${id}/dependencies`);
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
