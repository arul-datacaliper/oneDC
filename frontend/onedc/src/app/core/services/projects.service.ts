import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project } from '../../shared/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/projects`;

  getAll() { 
    console.log('ProjectsService: Making API call to', this.base); // Debug log
    return this.http.get<Project[]>(this.base); 
  }

  getById(id: string) {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  create(project: Partial<Project>) { 
    return this.http.post<Project>(this.base, project); 
  }

  update(id: string, project: Partial<Project>) {
    return this.http.put<Project>(`${this.base}/${id}`, project);
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
