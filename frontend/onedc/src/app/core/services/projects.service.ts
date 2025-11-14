import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project } from '../../shared/models';
import { environment } from '../../../environments/environment';

// DTOs to match backend
export interface ProjectMemberDto {
  userId: string;
  projectRole: 'MEMBER' | 'LEAD' | 'CONTRIBUTOR' | 'REVIEWER';
}

// Interface for project usage check response
export interface ProjectUsageResponse {
  hasTimesheets: boolean;
  hasAllocations: boolean;
  hasUsage: boolean;
  canChangeClient: boolean;
}

export interface ProjectCreateDto {
  clientId: string;
  code: string;
  name: string;
  description?: string; // Add description field
  status: string;
  billable: boolean;
  defaultApprover?: string;
  startDate?: string;
  endDate?: string;
  plannedReleaseDate?: string;
  budgetHours?: number;
  budgetCost?: number;
  projectMembers: ProjectMemberDto[];
}

export interface ProjectUpdateDto extends ProjectCreateDto {
  projectId: string;
}

export interface ProjectMemberResponseDto {
  userId: string;
  projectRole: 'MEMBER' | 'LEAD' | 'CONTRIBUTOR' | 'REVIEWER';
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'EMPLOYEE' | 'APPROVER' | 'ADMIN';
  jobTitle?: string;
  department?: string;
}

export interface ProjectResponseDto {
  projectId: string;
  clientId: string;
  code: string;
  name: string;
  description?: string; // Add description field
  status: string;
  billable: boolean;
  defaultApprover?: string;
  startDate?: string;
  endDate?: string;
  plannedReleaseDate?: string;
  budgetHours?: number;
  budgetCost?: number;
  createdAt: string;
  projectMembers: ProjectMemberResponseDto[];
  client?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/projects`;

  getAll() { 
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

  // New methods for project members
  getAllWithMembers() {
    console.log('ProjectsService: Making API call to', `${this.base}/with-members`);
    return this.http.get<ProjectResponseDto[]>(`${this.base}/with-members`);
  }

  getByIdWithMembers(id: string) {
    return this.http.get<ProjectResponseDto>(`${this.base}/${id}/with-members`);
  }

  createWithMembers(project: ProjectCreateDto) {
    return this.http.post<ProjectResponseDto>(`${this.base}/with-members`, project);
  }

  updateWithMembers(id: string, project: ProjectUpdateDto) {
    return this.http.put<ProjectResponseDto>(`${this.base}/${id}/with-members`, project);
  }

  // Check if project has any timesheets or allocations (single efficient API call)
  checkProjectUsage(id: string) {
    return this.http.get<ProjectUsageResponse>(`${this.base}/${id}/has-usage`);
  }
}
