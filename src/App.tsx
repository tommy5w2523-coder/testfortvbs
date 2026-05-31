import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Sliders, Calendar, BarChart3, RotateCcw, 
  HelpCircle, Clock, Users, PlusCircle, 
  AlertTriangle, Shield, CheckSquare, Sparkles, BookOpen 
} from 'lucide-react';
import ScheduleOverview from './components/ScheduleOverview';
import LeaveRequestForm from './components/LeaveRequestForm';
import ConfigRules from './components/ConfigRules';
import MonthlySummary from './components/MonthlySummary';

import { 
  DEFAULT_EMPLOYEES, 
  DEFAULT_STAFFING, 
  DEFAULT_SUPERVISOR_CONFLICTS, 
  DEFAULT_REPORTER_CONFLICTS, 
  DEFAULT_LEAVE_TYPES, 
  DEFAULT_LEAVE_REQUESTS, 
  generateInitialSchedule 
} from './data';
import { 
  Employee, 
  DailySchedule, 
  LeaveRequest, 
  OptimalStaffing, 
  ReporterCombinationConflict, 
  LeaveTypeDefinition, 
  ShiftType 
} from './types';
import { checkDailySchedule } from './rulesEngine';

const LS_KEY_EMPLOYEES = 'pcs_employees';
const LS_KEY_SCHEDULE = 'pcs_schedule';
const LS_KEY_LEAVE_REQ = 'pcs_leave_req';
const LS_KEY_STAFFING = 'pcs_staffing';
const LS_KEY_SUP_CONFLICTS = 'pcs_sup_conflicts';
const LS_KEY_REP_CONFLICTS = 'pcs_rep_conflicts';
const LS_KEY_LEAVE_TYPES = 'pcs_leave_types';

export default function App() {
  
  // 1. Core database states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [staffingRules, setStaffingRules] = useState<OptimalStaffing[]>([]);
  const [supervisorConflicts, setSupervisorConflicts] = useState<string[]>([]);
  const [reporterConflicts, setReporterConflicts] = useState<ReporterCombinationConflict[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeDefinition[]>([]);

  // Tab Manager state
  const [activeTab, setActiveTab] = useState<'roster' | 'requests' | 'config' | 'monthly'>('roster');

  // Triggering visual feedback on mount or action
  const [isResetToast, setIsResetToast] = useState(false);
  const [toastText, setToastText] = useState('');

  // 2. Load initially from Local Storage, otherwise fallback to defaults
  useEffect(() => {
    try {
      const storedEmp = localStorage.getItem(LS_KEY_EMPLOYEES);
      const storedSched = localStorage.getItem(LS_KEY_SCHEDULE);
      const storedLeaveReq = localStorage.getItem(LS_KEY_LEAVE_REQ);
      const storedStaffing = localStorage.getItem(LS_KEY_STAFFING);
      const storedSupConf = localStorage.getItem(LS_KEY_SUP_CONFLICTS);
      const storedRepConf = localStorage.getItem(LS_KEY_REP_CONFLICTS);
      const storedLTypes = localStorage.getItem(LS_KEY_LEAVE_TYPES);

      setEmployees(storedEmp ? JSON.parse(storedEmp) : DEFAULT_EMPLOYEES);
      setSchedule(storedSched ? JSON.parse(storedSched) : generateInitialSchedule());
      setLeaveRequests(storedLeaveReq ? JSON.parse(storedLeaveReq) : DEFAULT_LEAVE_REQUESTS);
      setStaffingRules(storedStaffing ? JSON.parse(storedStaffing) : DEFAULT_STAFFING);
      setSupervisorConflicts(storedSupConf ? JSON.parse(storedSupConf) : DEFAULT_SUPERVISOR_CONFLICTS);
      setReporterConflicts(storedRepConf ? JSON.parse(storedRepConf) : DEFAULT_REPORTER_CONFLICTS);
      setLeaveTypes(storedLTypes ? JSON.parse(storedLTypes) : DEFAULT_LEAVE_TYPES);
    } catch (e) {
      console.error('Error loading Local Storage state, using defaults:', e);
      // Failsafe
      resetToDefault();
    }
  }, []);

  // 3. Persist to Local Storage whenever states change
  useEffect(() => {
    if (employees.length > 0) localStorage.setItem(LS_KEY_EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (schedule.length > 0) localStorage.setItem(LS_KEY_SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    if (leaveRequests.length > 0) localStorage.setItem(LS_KEY_LEAVE_REQ, JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    if (staffingRules.length > 0) localStorage.setItem(LS_KEY_STAFFING, JSON.stringify(staffingRules));
  }, [staffingRules]);

  useEffect(() => {
    if (supervisorConflicts.length > 0) localStorage.setItem(LS_KEY_SUP_CONFLICTS, JSON.stringify(supervisorConflicts));
  }, [supervisorConflicts]);

  useEffect(() => {
    if (reporterConflicts.length > 0) localStorage.setItem(LS_KEY_REP_CONFLICTS, JSON.stringify(reporterConflicts));
  }, [reporterConflicts]);

  useEffect(() => {
    if (leaveTypes.length > 0) localStorage.setItem(LS_KEY_LEAVE_TYPES, JSON.stringify(leaveTypes));
  }, [leaveTypes]);

  // Reset helper
  const resetToDefault = () => {
    localStorage.clear();
    setEmployees(DEFAULT_EMPLOYEES);
    setSchedule(generateInitialSchedule());
    setLeaveRequests(DEFAULT_LEAVE_REQUESTS);
    setStaffingRules(DEFAULT_STAFFING);
    setSupervisorConflicts(DEFAULT_SUPERVISOR_CONFLICTS);
    setReporterConflicts(DEFAULT_REPORTER_CONFLICTS);
    setLeaveTypes(DEFAULT_LEAVE_TYPES);

    setToastText('🔄 系統資料庫已成功重置為原始預設值！(June 2026 模擬資料已加載)');
    setIsResetToast(true);
    setTimeout(() => setIsResetToast(false), 3500);
  };

  // Direct roster manipulation cell handler
  const handleUpdateShift = (employeeId: string, date: string, nextShift: ShiftType) => {
    setSchedule(prevSchedule => {
      return prevSchedule.map(daySched => {
        if (daySched.date === date) {
          return {
            ...daySched,
            shifts: {
              ...daySched.shifts,
              [employeeId]: nextShift
            }
          };
        }
        return daySched;
      });
    });
  };

  // New leave request submission handler
  const handleSubmitRequest = (newRequest: Omit<LeaveRequest, 'id' | 'timestamp' | 'status'>) => {
    const freshId = `req_${Date.now()}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const fullRecord: LeaveRequest = {
      ...newRequest,
      id: freshId,
      timestamp,
      status: 'Pending',
    };

    setLeaveRequests(prev => [...prev, fullRecord]);
  };

  // Approve a leave request (sets request details, and AUTOMATICALLY marks active dates in roster to "休假")
  const handleApproveRequest = (id: string, approverName: string) => {
    const approvalTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Find request to fetch dates
    const targetReq = leaveRequests.find(r => r.id === id);
    if (!targetReq) return;

    // 1. Update request status database
    setLeaveRequests(prev => {
      return prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: 'Approved',
            approver: approverName,
            approvalTime,
            remarks: '批准原因：經系統衝突預覽確認無嚴重排班人力空窗，同意准假。'
          };
        }
        return r;
      });
    });

    // 2. Automatically write '休假' to corresponding dates on the shift roster
    const applicant = employees.find(e => e.name === targetReq.applicantName);
    if (!applicant) return;

    const start = new Date(targetReq.startDate);
    const end = new Date(targetReq.endDate);
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

    setSchedule(prevSchedule => {
      return prevSchedule.map(daySched => {
        if (affectedDates.includes(daySched.date)) {
          return {
            ...daySched,
            shifts: {
              ...daySched.shifts,
              [applicant.id]: '休假' as ShiftType
            }
          };
        }
        return daySched;
      });
    });
  };

  // Reject a leave request
  const handleRejectRequest = (id: string, approverName: string, remarks: string) => {
    const approvalTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setLeaveRequests(prev => {
      return prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: 'Rejected',
            approver: approverName,
            approvalTime,
            remarks: `駁回備註：${remarks}`
          };
        }
        return r;
      });
    });
  };

  // Inject a mock pending request for user friendly demonstration
  const handleInjectPendingRequest = () => {
    const possibleNames = ['秉宏', '沛緰', '宗澤', '亭廷', '書維', '啟明'];
    const randomName = possibleNames[Math.floor(Math.random() * possibleNames.length)];
    const randomDays = [1, 5, 10, 15, 20, 25];
    const day = randomDays[Math.floor(Math.random() * randomDays.length)];
    const targetDate = `2026-06-${day < 10 ? '0' + day : day}`;
    const reasons = [
      '配合家族掃墓公休活動',
      '個人健康检查與安排胃鏡門診',
      '出外調查專欄政治新聞特別講座',
      '公務積累辦理私人產權補辦',
      '家庭水電突發事故急修'
    ];
    const randomReason = reasons[Math.floor(Math.random() * reasons.length)];

    const applicant = employees.find(e => e.name === randomName);
    const leaveT = applicant?.role === 'Supervisor' ? '補休(半天)' : '特休(全天)';

    const newReq: Omit<LeaveRequest, 'id' | 'timestamp' | 'status'> = {
      applicantName: randomName,
      startDate: targetDate,
      endDate: targetDate,
      leaveType: leaveT,
      reason: randomReason,
      contactPhone: '0988-' + Math.floor(100000 + Math.random() * 900000)
    };

    handleSubmitRequest(newReq);
    setToastText(`✨ 成功插入一份由 [${randomName}] 提交的待審核假單 (日期:${targetDate})，可用於 What-If 調度預覽！`);
    setIsResetToast(true);
    setTimeout(() => setIsResetToast(false), 4500);
  };

  // 4. Global Alerts Counter for header: Counts total days in June with ANY error/warning conflict
  const globalAlertsCount = useMemo(() => {
    let count = 0;
    schedule.forEach(day => {
      const stats = checkDailySchedule(
        day.date,
        day.shifts,
        employees,
        staffingRules,
        supervisorConflicts,
        reporterConflicts
      );
      // Filter out only errors and warnings from scheduling rules
      const ruleConflicts = stats.conflicts.filter(c => c.type === 'supervisor' || c.type === 'reporter');
      if (ruleConflicts.length > 0) {
        count++;
      }
    });
    return count;
  }, [schedule, employees, staffingRules, supervisorConflicts, reporterConflicts]);

  const totalPendingCount = useMemo(() => {
    return leaveRequests.filter(r => r.status === 'Pending').length;
  }, [leaveRequests]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-16 antialiased">
      
      {/* Dynamic Master Toast */}
      {isResetToast && (
        <div className="fixed bottom-5 left-5 z-50 max-w-sm bg-slate-900 border-l-4 border-indigo-500 text-white rounded-lg shadow-xl p-4 animate-in slide-in-from-left duration-300">
          <div className="text-xs font-bold text-slate-200">系統即時反饋</div>
          <p className="text-[11px] text-slate-300 mt-0.5">{toastText}</p>
        </div>
      )}

      {/* High-Fidelity App Shell Header */}
      <header className="bg-slate-900 text-white border-b border-indigo-950 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & title paired nicely */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-5.5 h-5.5" />
              </span>
              <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-1">
                政治組排班管理與決策支援系統
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Political Team Automated Shift Management & Decision Support System (Google Web App Dashboard)
            </p>
          </div>

          {/* Core Analytics Badges & quick resets */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            
            {/* Live UTC indicator */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-slate-300 select-none">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono scale-95 origin-left">2026-05-31 (滾動排班中)</span>
            </div>

            {/* Total pending requests badge */}
            <div className={`rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5 font-bold ${
              totalPendingCount > 0 
                ? 'bg-amber-950 border-amber-800 text-amber-200 animate-pulse' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>待核准：{totalPendingCount} 件</span>
            </div>

            {/* Active alerts warnings badge */}
            <div className={`rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5 font-bold ${
              globalAlertsCount > 0 
                ? 'bg-red-950 border-red-900 text-red-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span>月衝突天數：{globalAlertsCount} 天</span>
            </div>

            {/* Action buttons reset / inject */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
              <button
                onClick={handleInjectPendingRequest}
                className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg hover:text-white transition-all flex items-center gap-1 mr-1"
                title="隨機向請假申請表提交一份 pending 假單，供主管測試"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                模擬假單入口
              </button>

              <button
                onClick={resetToDefault}
                className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-755 text-slate-350 hover:text-red-400 p-1.5 rounded-lg transition-all"
                title="清除 LocalStorage 所有修改，回歸工廠初始精美測試資料"
              >
                <RotateCcw className="w-4 h-4 cursor-pointer" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* GAS System integration structural advice banner */}
        <div className="bg-slate-900 text-slate-300 rounded-xl p-4.5 mb-6 border-l-4 border-indigo-600 shadow-sm text-xs leading-relaxed">
          <div className="font-bold flex items-center gap-1.5 text-white mb-1.5 select-none text-[13px]">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            自動化小組排班系統：系統設計核心架構
          </div>
          本數位儀表板由 <strong>Google Apps Script - HTML Service</strong> 負責整合渲染。底層儲存以 <strong>Google Sheets</strong> 為中央資料庫，支援員工手機以 
          <strong> Google Forms (請假表單)</strong> 回報，GAS 接收表單在 <code>onFormSubmit</code> 中自動核算雙主管衝突、複數記者組合互斥，並支援一鍵寫回。
        </div>

        {/* Dynamic Sheets Tab Menu (Google Sheets Workspace simulation) */}
        <div className="flex border-b border-slate-200 gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('roster')}
            className={`cursor-pointer px-4 py-2.5 rounded-t-lg font-medium text-xs flex items-center gap-2 select-none shrink-0 transition-all ${
              activeTab === 'roster'
                ? 'bg-white border-t border-x border-slate-200 text-indigo-600 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'roster' ? 'text-indigo-600' : 'text-slate-400'}`} />
            排班總覽 (Master Schedule & Stats)
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`cursor-pointer px-4 py-2.5 rounded-t-lg font-medium text-xs flex items-center gap-2 select-none shrink-0 transition-all ${
              activeTab === 'requests'
                ? 'bg-white border-t border-x border-slate-200 text-indigo-600 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className={`w-4 h-4 ${activeTab === 'requests' ? 'text-indigo-600' : 'text-slate-400'}`} />
            假單核准與 What-If 模擬 ({totalPendingCount})
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`cursor-pointer px-4 py-2.5 rounded-t-lg font-medium text-xs flex items-center gap-2 select-none shrink-0 transition-all ${
              activeTab === 'config'
                ? 'bg-white border-t border-x border-slate-200 text-indigo-600 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sliders className={`w-4 h-4 ${activeTab === 'config' ? 'text-indigo-600' : 'text-slate-400'}`} />
            自動排班規則配置 (Config Rules)
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`cursor-pointer px-4 py-2.5 rounded-t-lg font-medium text-xs flex items-center gap-2 select-none shrink-0 transition-all ${
              activeTab === 'monthly'
                ? 'bg-white border-t border-x border-slate-200 text-indigo-600 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'monthly' ? 'text-indigo-600' : 'text-slate-400'}`} />
            每月請假天數彙總 (Excel Export)
          </button>
        </div>

        {/* Tab contents with state hooks */}
        <div className="space-y-6">
          {activeTab === 'roster' && (
            <ScheduleOverview
              employees={employees}
              schedule={schedule}
              staffingRules={staffingRules}
              supervisorConflicts={supervisorConflicts}
              reporterConflicts={reporterConflicts}
              onUpdateShift={handleUpdateShift}
            />
          )}

          {activeTab === 'requests' && (
            <LeaveRequestForm
              employees={employees}
              leaveRequests={leaveRequests}
              schedule={schedule}
              staffingRules={staffingRules}
              supervisorConflicts={supervisorConflicts}
              reporterConflicts={reporterConflicts}
              leaveTypes={leaveTypes}
              onSubmitRequest={handleSubmitRequest}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
            />
          )}

          {activeTab === 'config' && (
            <ConfigRules
              employees={employees}
              staffingRules={staffingRules}
              supervisorConflicts={supervisorConflicts}
              reporterConflicts={reporterConflicts}
              leaveTypes={leaveTypes}
              onUpdateStaffing={setStaffingRules}
              onUpdateSupervisorConflicts={setSupervisorConflicts}
              onUpdateReporterConflicts={setReporterConflicts}
              onUpdateLeaveTypes={setLeaveTypes}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlySummary
              employees={employees}
              leaveRequests={leaveRequests}
              leaveTypes={leaveTypes}
            />
          )}
        </div>

      </main>

      {/* Outer subtle branding */}
      <footer className="mt-16 text-center text-slate-400 text-[10px] space-y-1">
        <p>政治組自動化排班管理系統 - HTML Service Supervisor Board Server Version 2.2.0</p>
        <p>Power by Google Apps Script & Google Sheets Standard Integration Suite</p>
      </footer>

    </div>
  );
}
