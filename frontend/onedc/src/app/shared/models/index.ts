export interface Client {
  clientId: string;
  name: string;
  code?: string;
  contactPerson?: string;
  email?: string;
  contactNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum EmployeeType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
  CONSULTANT = 'CONSULTANT'
}

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  APPROVER = 'APPROVER', 
  ADMIN = 'ADMIN'
}

export interface Employee {
  userId: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  gender?: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  dateOfJoining?: string; // YYYY-MM-DD
  jobTitle?: string;
  role: UserRole;
  department?: string;
  employeeType?: EmployeeType;
  personalEmail?: string;
  workEmail: string;
  contactNumber?: string;
  emergencyContactNumber?: string;
  // Nested address objects (for form compatibility)
  presentAddress?: Address;
  permanentAddress?: Address;
  // Flattened address fields (from API)
  presentAddressLine1?: string;
  presentAddressLine2?: string;
  presentCity?: string;
  presentState?: string;
  presentCountry?: string;
  presentZipCode?: string;
  permanentAddressLine1?: string;
  permanentAddressLine2?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentCountry?: string;
  permanentZipCode?: string;
  isActive: boolean;
  managerId?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Project {
  projectId: string;
  clientId: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'CLOSED';
  billable: boolean;
  defaultApprover?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  plannedReleaseDate?: string; // YYYY-MM-DD
  budgetHours?: number;
  budgetCost?: number;
  createdAt?: string;
  client?: Client;
}

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED';

export enum TaskType {
  DEV = 0,        // Development
  QA = 1,         // Quality Assurance
  UX = 2,         // User Experience
  UI = 3,         // User Interface
  MEETING = 4,    // Meetings
  RND = 5,        // Research & Development
  ADHOC = 6,      // Ad-hoc tasks
  PROCESS = 7,    // Process work
  OPERATIONS = 8  // Operations
}

// Helper function to get task type display names
export function getTaskTypeDisplayName(taskType: TaskType): string {
  switch (taskType) {
    case TaskType.DEV:
      return 'Development';
    case TaskType.QA:
      return 'Quality Assurance';
    case TaskType.UX:
      return 'User Experience';
    case TaskType.UI:
      return 'User Interface';
    case TaskType.MEETING:
      return 'Meeting';
    case TaskType.RND:
      return 'R&D';
    case TaskType.ADHOC:
      return 'Ad-hoc';
    case TaskType.PROCESS:
      return 'Process';
    case TaskType.OPERATIONS:
      return 'Operations';
    default:
      return 'Development';
  }
}

// Helper function to get all task types for dropdowns
export function getTaskTypes(): { value: TaskType; label: string }[] {
  return [
    { value: TaskType.DEV, label: 'Development' },
    { value: TaskType.QA, label: 'Quality Assurance' },
    { value: TaskType.UX, label: 'User Experience' },
    { value: TaskType.UI, label: 'User Interface' },
    { value: TaskType.MEETING, label: 'Meeting' },
    { value: TaskType.RND, label: 'R&D' },
    { value: TaskType.ADHOC, label: 'Ad-hoc' },
    { value: TaskType.PROCESS, label: 'Process' },
    { value: TaskType.OPERATIONS, label: 'Operations' }
  ];
}

export interface TimesheetEntry {
  entryId: string;
  userId: string;
  projectId: string;
  workDate: string; // YYYY-MM-DD
  hours: number;
  description?: string;
  ticketRef?: string;
  taskType: TaskType;
  status: TimesheetStatus;
}

// Legacy AppUser interface for backward compatibility
export interface AppUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  isActive: boolean;
  passwordHash?: string;
  managerId?: string;
  lastLoginAt?: string;
  createdAt?: string;
}
