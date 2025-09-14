export interface Project {
  projectId: string;
  clientId: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'CLOSED';
  billable: boolean;
}

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED';

export interface TimesheetEntry {
  entryId: string;
  userId: string;
  projectId: string;
  workDate: string; // YYYY-MM-DD
  hours: number;
  description?: string;
  ticketRef?: string;
  status: TimesheetStatus;
}
