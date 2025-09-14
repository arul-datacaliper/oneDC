import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project } from '../../shared/models';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
   private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/projects`;

  getAll() { return this.http.get<Project[]>(this.base); }
  create(p: Partial<Project>) { return this.http.post<Project>(this.base, p); }
}
