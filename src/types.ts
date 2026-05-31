export type ShiftType = '上班' | '休假' | '小夜';

export interface Employee {
  id: string;
  name: string;
  role: 'Supervisor' | 'Reporter';
}

export interface OptimalStaffing {
  id: string;
  dateType: 'weekday' | 'weekend' | 'specific';
  specificDate?: string; // YYYY-MM-DD
  supervisorDemand: number;
  reporterDemand: number;
}

export interface ReporterCombinationConflict {
  id: number;
  members: string[]; // List of names, e.g. ['亭廷', '豐瑋']
}

export interface LeaveTypeDefinition {
  typeName: string;
  countingFactor: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  timestamp: string;
  applicantName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveType: string;
  reason: string;
  contactPhone?: string;
  status: LeaveStatus;
  approver?: string;
  approvalTime?: string;
  remarks?: string;
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  shifts: Record<string, ShiftType>; // employeeId -> ShiftType
}

export interface ConflictAlert {
  type: 'supervisor' | 'reporter' | 'shortage' | 'overscheduled';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export interface DailyStats {
  date: string;
  onDutySupervisors: number;
  onDutyReporters: number;
  supervisorDemand: number;
  reporterDemand: number;
  supervisorStatus: '正常' | string; // e.g. "超額1" or "不足1"
  reporterStatus: '正常' | string; // e.g. "超額1" or "不足1"
  conflicts: ConflictAlert[];
}
