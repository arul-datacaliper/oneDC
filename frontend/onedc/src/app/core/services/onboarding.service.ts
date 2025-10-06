import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Enums and interfaces
export enum SkillLevel {
  Beginner = 1,
  Intermediate = 2,
  Advanced = 3,
  Expert = 4
}

export interface UserProfile {
  userProfileId: string;
  userId: string;
  profilePhotoUrl?: string;
  bio?: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  location?: string;
  dateOfJoining?: string; // YYYY-MM-DD
  employeeId?: string;
  reportingManager?: string;
  totalExperienceYears?: number;
  educationBackground?: string;
  certifications?: string;
  linkedInProfile?: string;
  gitHubProfile?: string;
  isOnboardingComplete: boolean;
  onboardingCompletedAt?: string;
}

export interface UserSkill {
  userSkillId: string;
  userId: string;
  skillName: string;
  level: SkillLevel;
  yearsOfExperience: number;
  description?: string;
  isPrimary: boolean;
}

export interface CreateUserProfileRequest {
  // User-editable fields only
  bio?: string;
  phoneNumber?: string;
  location?: string;
  totalExperienceYears?: number;
  educationBackground?: string;
  certifications?: string;
  linkedInProfile?: string;
  gitHubProfile?: string;
  // Note: Admin-managed fields (department, jobTitle, employeeId, dateOfJoining, reportingManager) 
  // are not included here as they come from the AppUser table and are managed by admins
}

export interface CreateUserSkillRequest {
  skillName: string;
  level: SkillLevel;
  yearsOfExperience: number;
  description?: string;
  isPrimary?: boolean;
}

export interface OnboardingStatus {
  userId: string;
  hasProfile: boolean;
  hasSkills: boolean;
  hasPhoto: boolean;
  isComplete: boolean;
  completionPercentage: number;
  missingSteps: string[];
}

export interface SkillLevelOption {
  value: number;
  name: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/onboarding`;

  // Profile management
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile/${userId}`);
  }

  createUserProfile(userId: string, profile: CreateUserProfileRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.baseUrl}/profile/${userId}`, profile);
  }

  updateUserProfile(userId: string, profile: CreateUserProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/profile/${userId}`, profile);
  }

  deleteUserProfile(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/profile/${userId}`);
  }

  // Photo management
  uploadProfilePhoto(userId: string, file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    
    return this.http.post<{ photoUrl: string }>(`${this.baseUrl}/profile/${userId}/photo`, formData);
  }

  deleteProfilePhoto(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/profile/${userId}/photo`);
  }

  // Skills management
  getUserSkills(userId: string): Observable<UserSkill[]> {
    return this.http.get<UserSkill[]>(`${this.baseUrl}/skills/${userId}`);
  }

  createUserSkill(userId: string, skill: CreateUserSkillRequest): Observable<UserSkill> {
    return this.http.post<UserSkill>(`${this.baseUrl}/skills/${userId}`, skill);
  }

  updateUserSkill(userId: string, skillId: string, skill: CreateUserSkillRequest): Observable<UserSkill> {
    return this.http.put<UserSkill>(`${this.baseUrl}/skills/${userId}/${skillId}`, skill);
  }

  deleteUserSkill(userId: string, skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/skills/${userId}/${skillId}`);
  }

  // Onboarding status
  getOnboardingStatus(userId: string): Observable<OnboardingStatus> {
    return this.http.get<OnboardingStatus>(`${this.baseUrl}/status/${userId}`);
  }

  completeOnboarding(userId: string): Observable<{ completed: boolean }> {
    return this.http.post<{ completed: boolean }>(`${this.baseUrl}/complete/${userId}`, {});
  }

  // Admin functions
  getAllUsersOnboardingStatus(): Observable<OnboardingStatus[]> {
    return this.http.get<OnboardingStatus[]>(`${this.baseUrl}/admin/status`);
  }

  // Helper methods
  getSkillLevels(): Observable<SkillLevelOption[]> {
    return this.http.get<SkillLevelOption[]>(`${this.baseUrl}/skill-levels`);
  }

  getSkillLevelDisplayName(level: SkillLevel): string {
    switch (level) {
      case SkillLevel.Beginner: return 'Beginner (< 1 year)';
      case SkillLevel.Intermediate: return 'Intermediate (1-3 years)';
      case SkillLevel.Advanced: return 'Advanced (3-7 years)';
      case SkillLevel.Expert: return 'Expert (7+ years)';
      default: return 'Unknown';
    }
  }

  validateFileType(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    return allowedTypes.includes(file.type.toLowerCase());
  }

  validateFileSize(file: File, maxSizeMB: number = 5): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}
