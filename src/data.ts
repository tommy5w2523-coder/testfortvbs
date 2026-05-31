import { Employee, OptimalStaffing, ReporterCombinationConflict, LeaveTypeDefinition, LeaveRequest, DailySchedule, ShiftType } from './types';

export const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp_qiming', name: '啟明', role: 'Supervisor' },
  { id: 'emp_shuwei', name: '書維', role: 'Supervisor' },
  { id: 'emp_tingting', name: '亭廷', role: 'Reporter' },
  { id: 'emp_yuna', name: '玉娜', role: 'Reporter' },
  { id: 'emp_binghong', name: '秉宏', role: 'Reporter' },
  { id: 'emp_zongze', name: '宗澤', role: 'Reporter' },
  { id: 'emp_peiyu', name: '沛緰', role: 'Reporter' },
  { id: 'emp_fengwei', name: '豐瑋', role: 'Reporter' },
];

export const DEFAULT_STAFFING: OptimalStaffing[] = [
  { id: 'st_weekday', dateType: 'weekday', supervisorDemand: 1, reporterDemand: 4 },
  { id: 'st_weekend', dateType: 'weekend', supervisorDemand: 0, reporterDemand: 2 },
  { id: 'st_special_debate', dateType: 'specific', specificDate: '2026-06-10', supervisorDemand: 1, reporterDemand: 5 },
];

export const DEFAULT_SUPERVISOR_CONFLICTS: string[] = ['啟明', '書維'];

export const DEFAULT_REPORTER_CONFLICTS: ReporterCombinationConflict[] = [
  { id: 1, members: ['亭廷', '豐瑋'] },
  { id: 2, members: ['豐瑋', '玉娜'] },
  { id: 3, members: ['宗澤', '玉娜'] },
  { id: 4, members: ['秉宏', '沛緰'] },
];

export const DEFAULT_LEAVE_TYPES: LeaveTypeDefinition[] = [
  { typeName: '特休(全天)', countingFactor: 1.0 },
  { typeName: '事假(全天)', countingFactor: 1.0 },
  { typeName: '病假(全天)', countingFactor: 1.0 },
  { typeName: '特休(半天)', countingFactor: 0.5 },
  { typeName: '補休(半天)', countingFactor: 0.5 },
];

export const DEFAULT_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'req_1',
    timestamp: '2026-05-30 09:12:00',
    applicantName: '玉娜',
    startDate: '2026-06-12',
    endDate: '2026-06-12',
    leaveType: '病假(全天)',
    reason: '例行牙醫回診進行微創手術',
    contactPhone: '0912-345678',
    status: 'Approved',
    approver: '啟明',
    approvalTime: '2026-05-30 11:30:00',
    remarks: '同意病假申請，當日已更新為休假。'
  },
  {
    id: 'req_2',
    timestamp: '2026-05-31 08:00:00',
    applicantName: '亭廷',
    startDate: '2026-06-05',
    endDate: '2026-06-05',
    leaveType: '特休(全天)',
    reason: '返鄉探親與家人聚會',
    contactPhone: '0922-111222',
    status: 'Pending',
    remarks: '平日請假。需確認組內當日出勤人數是否充足。'
  },
  {
    id: 'req_3',
    timestamp: '2026-05-31 08:30:00',
    applicantName: '書維',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    leaveType: '補休(半天)',
    reason: '補假半天處理私事',
    contactPhone: '0933-444555',
    status: 'Pending',
    remarks: '主管請假測試。若啟明同日也請假，將會觸發主管互斥警報！'
  },
  {
    id: 'req_4',
    timestamp: '2026-05-31 08:45:00',
    applicantName: '啟明',
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    leaveType: '特休(全天)',
    reason: '家中有事需處理',
    contactPhone: '0944-777888',
    status: 'Pending',
    remarks: '主管與書維同日請假衝突測試。'
  },
  {
    id: 'req_5',
    timestamp: '2026-05-31 09:00:00',
    applicantName: '豐瑋',
    startDate: '2026-06-20',
    endDate: '2026-06-20',
    leaveType: '特休(全天)',
    reason: '週末家族旅行',
    contactPhone: '0955-333444',
    status: 'Approved',
    approver: '書維',
    approvalTime: '2026-05-31 10:15:00',
    remarks: '同意週末特休。'
  },
  {
    id: 'req_6',
    timestamp: '2026-05-31 09:15:00',
    applicantName: '玉娜',
    startDate: '2026-06-20',
    endDate: '2026-06-20',
    leaveType: '事假(全天)',
    reason: '非個人旅行，處理重要房屋產權手續',
    contactPhone: '0912-345678',
    status: 'Pending',
    remarks: '這將與已批准的豐瑋（2026-06-20）形成「豐瑋－玉娜」互斥組合警報！'
  }
];

export function generateInitialSchedule(): DailySchedule[] {
  const scheduleList: DailySchedule[] = [];
  const totalDays = 30; // June 2026 has 30 days
  const year = 2026;
  const month = 6; // June

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateKey = `${year}-06-${dayStr}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const shifts: Record<string, ShiftType> = {};

    // 1. Supervisors Setup: Spark/QiMing (emp_qiming) and ShuWei (emp_shuwei)
    // Rotate shift duty on weekdays: one is "上班", one is "小夜" or "上班".
    // Weekends: normally both off, or check demand
    if (isWeekend) {
      shifts['emp_qiming'] = '休假';
      shifts['emp_shuwei'] = '休假';
    } else {
      // Rotation: qi-ming is on-duty/night, shu-wei is on-duty
      if (day % 2 === 0) {
        shifts['emp_qiming'] = '小夜';
        shifts['emp_shuwei'] = '上班';
      } else {
        shifts['emp_qiming'] = '上班';
        shifts['emp_shuwei'] = '小夜';
      }
    }

    // 2. Reporters Setup:
    // 亭廷 (emp_tingting), 玉娜 (emp_yuna), 秉宏 (emp_binghong), 宗澤 (emp_zongze), 沛緰 (emp_peiyu), 豐瑋 (emp_fengwei)
    // Weekdays demand: 4 reporters. Weekends demand: 2 reporters.
    if (isWeekend) {
      // Setup weekend rotations: ensure exactly 2 or 3 reporters are on-duty, rest off
      // We will rotate reporter indices
      const shiftPatternIdx = (day % 3);
      if (shiftPatternIdx === 0) {
        shifts['emp_tingting'] = '上班';
        shifts['emp_yuna'] = '小夜';
        shifts['emp_binghong'] = '休假';
        shifts['emp_zongze'] = '休假';
        shifts['emp_peiyu'] = '休假';
        shifts['emp_fengwei'] = '休假';
      } else if (shiftPatternIdx === 1) {
        shifts['emp_tingting'] = '休假';
        shifts['emp_yuna'] = '休假';
        shifts['emp_binghong'] = '上班';
        shifts['emp_zongze'] = '小夜';
        shifts['emp_peiyu'] = '休假';
        shifts['emp_fengwei'] = '休假';
      } else {
        shifts['emp_tingting'] = '休假';
        shifts['emp_yuna'] = '休假';
        shifts['emp_binghong'] = '休假';
        shifts['emp_zongze'] = '休假';
        shifts['emp_peiyu'] = '上班';
        shifts['emp_fengwei'] = '上班'; // approved leave on june 20 will override this
      }
    } else {
      // Weekday shifts: 4-5 reporters on shift
      // Let's rotate 1-2 reporters off each day
      const offRepIdx1 = (day % 6);
      const offRepIdx2 = ((day + 2) % 6);

      const reporterIds = ['emp_tingting', 'emp_yuna', 'emp_binghong', 'emp_zongze', 'emp_peiyu', 'emp_fengwei'];
      reporterIds.forEach((id, rIdx) => {
        if (rIdx === offRepIdx1 || rIdx === offRepIdx2) {
          shifts[id] = '休假';
        } else if (rIdx === (day % 5)) {
          shifts[id] = '小夜';
        } else {
          shifts[id] = '上班';
        }
      });
    }

    // Apply approved leaves from seed data:
    // Query approved leave for this day:
    // 1) 玉娜 (emp_yuna) Approved "病假(全天)" on 2026-06-12
    if (dateKey === '2026-06-12') {
      shifts['emp_yuna'] = '休假';
    }
    // 2) 豐瑋 (emp_fengwei) Approved "特休(全天)" on 2026-06-20
    if (dateKey === '2026-06-20') {
      shifts['emp_fengwei'] = '休假';
    }

    scheduleList.push({
      date: dateKey,
      shifts
    });
  }

  return scheduleList;
}
