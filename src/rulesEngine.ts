import { Employee, OptimalStaffing, ReporterCombinationConflict, LeaveTypeDefinition, LeaveRequest, DailySchedule, DailyStats, ConflictAlert, ShiftType } from './types';

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Format date key to weekday label or specific override rule
 */
export function getDemandRequirements(
  dateStr: string,
  staffingRules: OptimalStaffing[]
): { supervisorDemand: number; reporterDemand: number } {
  // 1. Search for specific date override
  const specific = staffingRules.find(r => r.dateType === 'specific' && r.specificDate === dateStr);
  if (specific) {
    return {
      supervisorDemand: specific.supervisorDemand,
      reporterDemand: specific.reporterDemand
    };
  }

  // 2. Search for weekend/weekday pattern
  const weekendMode = isWeekend(dateStr);
  const pattern = staffingRules.find(r => r.dateType === (weekendMode ? 'weekend' : 'weekday'));
  
  return {
    supervisorDemand: pattern ? pattern.supervisorDemand : (weekendMode ? 0 : 1),
    reporterDemand: pattern ? pattern.reporterDemand : (weekendMode ? 2 : 4)
  };
}

/**
 * Analyzes a single day's schedule against all active rules and configuration.
 * Returns fully calculated counts, excess/shortage, and conflict triggers.
 */
export function checkDailySchedule(
  dateStr: string,
  shifts: Record<string, ShiftType>,
  employees: Employee[],
  staffingRules: OptimalStaffing[],
  supervisorConflicts: string[],
  reporterConflicts: ReporterCombinationConflict[]
): DailyStats {
  const supervisors = employees.filter(e => e.role === 'Supervisor');
  const reporters = employees.filter(e => e.role === 'Reporter');

  // 1. Count on-duty counts (where '上班' and '小夜' qualify as on-duty as per the specification)
  let onDutySupervisors = 0;
  let onDutyReporters = 0;

  supervisors.forEach(emp => {
    const shift = shifts[emp.id] || '上班';
    if (shift === '上班' || shift === '小夜') {
      onDutySupervisors++;
    }
  });

  reporters.forEach(emp => {
    const shift = shifts[emp.id] || '上班';
    if (shift === '上班' || shift === '小夜') {
      onDutyReporters++;
    }
  });

  // 2. Fetch required demands
  const { supervisorDemand, reporterDemand } = getDemandRequirements(dateStr, staffingRules);

  // 3. Compute excess/shortage statuses
  const supervisorDiff = onDutySupervisors - supervisorDemand;
  const supervisorStatus = supervisorDiff > 0 
    ? `超額${supervisorDiff}` 
    : supervisorDiff < 0 
      ? `不足${Math.abs(supervisorDiff)}` 
      : '正常';

  const reporterDiff = onDutyReporters - reporterDemand;
  const reporterStatus = reporterDiff > 0 
    ? `超額${reporterDiff}` 
    : reporterDiff < 0 
      ? `不足${Math.abs(reporterDiff)}` 
      : '正常';

  // 4. Identify conflicts
  const conflicts: ConflictAlert[] = [];

  // Check supervisor mutual leave conflict
  // Supervisors in conflict list taking '休假' of any kind on same day
  const supervisorsOnLeave = supervisors.filter(emp => {
    // Is this supervisor in the conflict rule?
    const isInRule = supervisorConflicts.includes(emp.name);
    // Is this supervisor on leave?
    const isOnLeave = (shifts[emp.id] || '上班') === '休假';
    return isInRule && isOnLeave;
  });

  if (supervisorsOnLeave.length >= 2) {
    conflicts.push({
      type: 'supervisor',
      severity: 'error',
      message: `主管互斥衝突: ${supervisorsOnLeave.map(s => s.name).join(' & ')} 同時休假`,
      details: `規則限制主管級人員：[${supervisorConflicts.join(', ')}] 不可同時排休假，以確保現場決策指揮力。`
    });
  }

  // Check Reporter Combination Leave conflict
  reporterConflicts.forEach(rule => {
    const reportersOnLeaveInRule = reporters.filter(emp => {
      const isInRule = rule.members.includes(emp.name);
      const isOnLeave = (shifts[emp.id] || '上班') === '休假';
      return isInRule && isOnLeave;
    });

    if (reportersOnLeaveInRule.length === rule.members.length && rule.members.length > 0) {
      conflicts.push({
        type: 'reporter',
        severity: 'warning',
        message: `記者互斥組合: ${rule.members.join(' & ')} 同時休假`,
        details: `違反互斥規則 ID ${rule.id}: 這些組員專業領域重複，不可同時排休假。`
      });
    }
  });

  // Staffing shortage alerts
  if (supervisorDiff < 0) {
    conflicts.push({
      type: 'shortage',
      severity: 'error',
      message: `主管人力不足: 在崗主管 ${onDutySupervisors} 人，需求 ${supervisorDemand} 人`,
      details: `平日/假日人力需求未達標。請調整假單或協調班表。`
    });
  }
  if (reporterDiff < 0) {
    conflicts.push({
      type: 'shortage',
      severity: 'warning',
      message: `記者人力不足: 在崗記者 ${onDutyReporters} 人，需求 ${reporterDemand} 人`,
      details: `此日期調度人數未達基本備勤標準。`
    });
  }

  return {
    date: dateStr,
    onDutySupervisors,
    onDutyReporters,
    supervisorDemand,
    reporterDemand,
    supervisorStatus,
    reporterStatus,
    conflicts
  };
}

/**
 * Simulated Leave Request evaluation for "What-If" preview mode.
 * Runs in-memory copy without updating database state.
 */
export function simulateLeaveRequestImpact(
  request: LeaveRequest,
  schedule: DailySchedule[],
  employees: Employee[],
  staffingRules: OptimalStaffing[],
  supervisorConflicts: string[],
  reporterConflicts: ReporterCombinationConflict[]
): {
  hasConflicts: boolean;
  affectedDates: string[];
  originalDailyStats: Record<string, DailyStats>;
  simulatedDailyStats: Record<string, DailyStats>;
} {
  const applicant = employees.find(e => e.name === request.applicantName);
  if (!applicant) {
    return { hasConflicts: false, affectedDates: [], originalDailyStats: {}, simulatedDailyStats: {} };
  }

  // Determine affected date range
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const affectedDates: string[] = [];

  const temp = new Date(start);
  while (temp <= end) {
    const yr = temp.getFullYear();
    const mo = temp.getMonth() + 1;
    const dy = temp.getDate();
    const dateStr = `${yr}-${mo < 10 ? '0' + mo : mo}-${dy < 10 ? '0' + dy : dy}`;
    affectedDates.push(dateStr);
    temp.setDate(temp.getDate() + 1);
  }

  const originalDailyStats: Record<string, DailyStats> = {};
  const simulatedDailyStats: Record<string, DailyStats> = {};
  let hasConflicts = false;

  affectedDates.forEach(dateStr => {
    const dailySched = schedule.find(s => s.date === dateStr);
    const existingShifts = dailySched ? { ...dailySched.shifts } : {};

    // 1. Calc Original Stats
    originalDailyStats[dateStr] = checkDailySchedule(
      dateStr,
      existingShifts,
      employees,
      staffingRules,
      supervisorConflicts,
      reporterConflicts
    );

    // 2. Calc Simulated Stats (force applicant's shift to '休假')
    const simulatedShifts = { ...existingShifts, [applicant.id]: '休假' as ShiftType };
    const simulated = checkDailySchedule(
      dateStr,
      simulatedShifts,
      employees,
      staffingRules,
      supervisorConflicts,
      reporterConflicts
    );
    simulatedDailyStats[dateStr] = simulated;

    // Check if new conflicts or severity changes occurred
    const origErrs = originalDailyStats[dateStr].conflicts.length;
    const simErrs = simulated.conflicts.length;

    // If simulated conflicts is greater, or contains errors that weren't there
    if (simErrs > 0) {
      // Find clean errors
      const hasMajorConflictNow = simulated.conflicts.some(sc => sc.severity === 'error' || sc.severity === 'warning');
      if (hasMajorConflictNow) {
         hasConflicts = true;
      }
    }
  });

  return {
    hasConflicts,
    affectedDates,
    originalDailyStats,
    simulatedDailyStats
  };
}

/**
 * Calculate Monthly Leave days for each employee in a year from Approved requests.
 * Accounts for counting factors of each leave type.
 */
export function calculateMonthlySummary(
  requests: LeaveRequest[],
  employees: Employee[],
  leaveTypeRules: LeaveTypeDefinition[],
  targetYear: number = 2026
): Record<string, Record<number, number>> {
  // Return structure: employeeId -> { [month 1-12]: totalDays }
  const summary: Record<string, Record<number, number>> = {};

  employees.forEach(e => {
    summary[e.id] = {};
    for (let m = 1; m <= 12; m++) {
      summary[e.id][m] = 0;
    }
  });

  // Calculate matching leaves
  const approvedRequests = requests.filter(r => r.status === 'Approved');

  approvedRequests.forEach(req => {
    const applicant = employees.find(e => e.name === req.applicantName);
    if (!applicant) return;

    // Locate factor
    const rule = leaveTypeRules.find(lt => lt.typeName === req.leaveType);
    const factor = rule ? rule.countingFactor : 1.0;

    // Distribute leave days across dates
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);

    const temp = new Date(start);
    while (temp <= end) {
      if (temp.getFullYear() === targetYear) {
        const month = temp.getMonth() + 1; // 1-indexed
        summary[applicant.id][month] += factor;
      }
      temp.setDate(temp.getDate() + 1);
    }
  });

  return summary;
}
