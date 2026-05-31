import React, { useMemo } from 'react';
import { Employee, DailySchedule, ShiftType, OptimalStaffing, ReporterCombinationConflict, DailyStats, ConflictAlert } from '../types';
import { checkDailySchedule, isWeekend, getDemandRequirements } from '../rulesEngine';
import { Calendar, User, ShieldAlert, Award, AlertTriangle, Users } from 'lucide-react';

interface ScheduleOverviewProps {
  employees: Employee[];
  schedule: DailySchedule[];
  staffingRules: OptimalStaffing[];
  supervisorConflicts: string[];
  reporterConflicts: ReporterCombinationConflict[];
  onUpdateShift: (employeeId: string, date: string, nextShift: ShiftType) => void;
}

export default function ScheduleOverview({
  employees,
  schedule,
  staffingRules,
  supervisorConflicts,
  reporterConflicts,
  onUpdateShift,
}: ScheduleOverviewProps) {
  
  // Total Days of June 2026
  const days = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 30; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      list.push(`2026-06-${dayStr}`);
    }
    return list;
  }, []);

  // Compute stats for each day
  const dailyStatsList = useMemo(() => {
    const statsMap: Record<string, DailyStats> = {};
    days.forEach(dateStr => {
      const daySched = schedule.find(s => s.date === dateStr);
      const shifts = daySched ? daySched.shifts : {};
      statsMap[dateStr] = checkDailySchedule(
        dateStr,
        shifts,
        employees,
        staffingRules,
        supervisorConflicts,
        reporterConflicts
      );
    });
    return statsMap;
  }, [schedule, employees, staffingRules, supervisorConflicts, reporterConflicts, days]);

  // Translate Day of Week
  const getWeekdayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const map = ['日', '一', '二', '三', '四', '五', '六'];
    return map[day];
  };

  // Helper to cycle through shifts
  const handleCellClick = (employeeId: string, date: string, currentShift: ShiftType) => {
    const shiftCycle: ShiftType[] = ['上班', '小夜', '休假'];
    const idx = shiftCycle.indexOf(currentShift);
    const nextShift = shiftCycle[(idx + 1) % shiftCycle.length];
    onUpdateShift(employeeId, date, nextShift);
  };

  // Check if specific cell is in a conflict
  const getCellConflictInfo = (employee: Employee, dateStr: string, currentShift: ShiftType): { hasConflict: boolean; type?: 'supervisor' | 'reporter' } => {
    if (currentShift !== '休假') return { hasConflict: false };
    
    const dayStats = dailyStatsList[dateStr];
    if (!dayStats || dayStats.conflicts.length === 0) return { hasConflict: false };

    // Check if employee matches the conflict details
    let isSupplicted = false;
    let isReporterlicted = false;

    dayStats.conflicts.forEach(alert => {
      if (alert.type === 'supervisor' && employee.role === 'Supervisor' && supervisorConflicts.includes(employee.name)) {
        isSupplicted = true;
      }
      if (alert.type === 'reporter' && employee.role === 'Reporter') {
        const matchingRule = reporterConflicts.find(rule => 
          rule.members.includes(employee.name) && 
          dayStats.conflicts.some(a => a.message.includes(employee.name))
        );
        if (matchingRule) {
          isReporterlicted = true;
        }
      }
    });

    if (isSupplicted) return { hasConflict: true, type: 'supervisor' };
    if (isReporterlicted) return { hasConflict: true, type: 'reporter' };

    return { hasConflict: false };
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden" id="schedule-overview">
      
      {/* Tab Header Detail */}
      <div className="p-5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            排班總覽 (Master Schedule & Daily Statistics)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            2026年6月政治組排班表。點選班型儲存格可循環切換：<strong>上班 ➔ 小夜 ➔ 休假</strong>。系統會即時進行衝突檢測並重新計算人力。
          </p>
        </div>
        
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">班型圖例：</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-sm text-slate-700">
            <span className="w-2.5 h-2.5 bg-slate-100 rounded-xs border border-slate-300"></span> 上班
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-sm text-amber-700 font-semibold">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs"></span> 小夜
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-sm text-emerald-700 font-medium">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span> 休假
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-sm text-red-700 font-medium animate-pulse">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-xs"></span> 主管互斥休假
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-sm text-orange-700 font-medium">
            <span className="w-2.5 h-2.5 bg-orange-400 rounded-xs"></span> 記者組合互斥
          </span>
        </div>
      </div>

      {/* Roster Spreadsheet Container WITH horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="min-w-[1300px]">
          <table className="w-full border-collapse text-left text-sm table-fixed">
            <thead>
              {/* Date Header Row */}
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="w-32 sticky left-0 bg-slate-50 z-20 px-3 py-3 border-r border-slate-200 font-medium text-xs">
                  成員姓名 / 日期
                </th>
                {days.map(dateStr => {
                  const dayNum = dateStr.split('-')[2];
                  const weekday = getWeekdayLabel(dateStr);
                  const isWe = isWeekend(dateStr);
                  return (
                    <th 
                      key={dateStr} 
                      className={`px-1 py-2 text-center border-r border-slate-100 text-xs font-mono font-medium ${
                        isWe ? 'bg-indigo-50/50 text-indigo-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      <div>{dayNum}</div>
                      <div className="text-[10px] mt-0.5 font-sans opacity-75">({weekday})</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              
              {/* Supervisor Rows */}
              <tr className="bg-slate-50/40 text-[10.5px] font-semibold text-slate-400 border-b border-slate-200">
                <td className="sticky left-0 bg-slate-50/90 z-10 px-3 py-1 border-r border-slate-200 text-[11px] font-display uppercase tracking-wider">
                  主管級別 (Supervisors)
                </td>
                <td colSpan={30} className="px-3 py-1 italic opacity-70">
                  雙主管互斥規則：[啟明] 與 [書維] 不可同日請假
                </td>
              </tr>
              
              {employees.filter(e => e.role === 'Supervisor').map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                  <td className="sticky left-0 bg-white hover:bg-slate-50 group z-10 px-3 py-2.5 border-r border-slate-200 font-medium text-slate-800 flex items-center justify-between gap-1 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {employee.name}
                    </span>
                    <span className="text-[9px] px-1 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm scale-90 font-sans">主管</span>
                  </td>
                  
                  {days.map(dateStr => {
                    const daySched = schedule.find(s => s.date === dateStr);
                    const currentShift = daySched?.shifts[employee.id] || '上班';
                    const conflictAnalysis = getCellConflictInfo(employee, dateStr, currentShift);
                    const isWe = isWeekend(dateStr);

                    let bgClass = 'bg-white hover:bg-slate-50 text-slate-700';
                    if (currentShift === '小夜') {
                      bgClass = 'bg-amber-50/90 text-amber-900 border-amber-200 hover:bg-amber-100/80 font-semibold';
                    } else if (currentShift === '休假') {
                      if (conflictAnalysis.hasConflict) {
                        bgClass = 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 font-semibold border border-red-300 ring-2 ring-red-100 z-5';
                      } else {
                        bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-medium';
                      }
                    }

                    return (
                      <td
                        key={dateStr}
                        onClick={() => handleCellClick(employee.id, dateStr, currentShift)}
                        className={`p-1 text-center cursor-pointer border-r border-slate-100 select-none transition-all ${bgClass}`}
                        title={`${employee.name} | ${dateStr} | 班型: ${currentShift}`}
                      >
                        <div className="flex flex-col items-center justify-center min-h-[30px]">
                          <span className="text-xs font-medium tracking-tight">
                            {currentShift}
                          </span>
                          {currentShift === '休假' && conflictAnalysis.hasConflict && (
                            <span className="text-[8px] text-red-500 font-bold leading-none animate-pulse">⚠️衝突</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Reporter Rows */}
              <tr className="bg-slate-50/40 text-[10.5px] font-semibold text-slate-400 border-b border-slate-200">
                <td className="sticky left-0 bg-slate-50/90 z-10 px-3 py-1 border-r border-slate-200 text-[11px] font-display uppercase tracking-wider">
                  記者組員 (Reporters)
                </td>
                <td colSpan={30} className="px-3 py-1 italic opacity-70">
                  多組員互斥規則：[亭廷-豐瑋]、[豐瑋-玉娜]、[宗澤-玉娜]、[秉宏-沛緰] 不可同日請假
                </td>
              </tr>

              {employees.filter(e => e.role === 'Reporter').map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                  <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-3 py-2.5 border-r border-slate-200 font-medium text-slate-800 flex items-center justify-between gap-1 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      {employee.name}
                    </span>
                    <span className="text-[9px] px-1 py-0.5 bg-slate-100 text-slate-600 rounded-sm scale-90 font-sans">記者</span>
                  </td>

                  {days.map(dateStr => {
                    const daySched = schedule.find(s => s.date === dateStr);
                    const currentShift = daySched?.shifts[employee.id] || '上班';
                    const conflictAnalysis = getCellConflictInfo(employee, dateStr, currentShift);
                    const isWe = isWeekend(dateStr);

                    let bgClass = 'bg-white hover:bg-slate-50 text-slate-700';
                    if (currentShift === '小夜') {
                      bgClass = 'bg-amber-50 text-amber-800 hover:bg-amber-100/80 font-semibold';
                    } else if (currentShift === '休假') {
                      if (conflictAnalysis.hasConflict) {
                        bgClass = 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100 font-semibold border border-orange-300 ring-2 ring-orange-100 z-5';
                      } else {
                        bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100';
                      }
                    }

                    return (
                      <td
                        key={dateStr}
                        onClick={() => handleCellClick(employee.id, dateStr, currentShift)}
                        className={`p-1 text-center cursor-pointer border-r border-slate-100 select-none transition-all ${bgClass}`}
                        title={`${employee.name} | ${dateStr} | 班型: ${currentShift}`}
                      >
                        <div className="flex flex-col items-center justify-center min-h-[30px]">
                          <span className="text-xs">
                            {currentShift}
                          </span>
                          {currentShift === '休假' && conflictAnalysis.hasConflict && (
                            <span className="text-[8px] text-orange-600 font-bold leading-none animate-pulse">組合衝突</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Statistics Separator */}
              <tr className="bg-slate-100 border-y border-slate-200 text-xs text-slate-700">
                <td className="sticky left-0 bg-slate-100 z-10 px-3 py-2 border-r border-slate-200 font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  每日統計數據
                </td>
                <td colSpan={30} className="px-3 py-2 text-xs text-slate-500 font-medium">
                  系統根據當日排班（包含小夜在崗）自動比對 Config 最佳化人力需求配置
                </td>
              </tr>

              {/* Supervisors Stats Row */}
              <tr className="border-b border-slate-100">
                <td className="sticky left-0 bg-white z-10 px-3 py-2.5 border-r border-slate-200 font-medium text-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="text-xs">在崗主管人數</div>
                  <div className="text-[9px] text-slate-400 font-normal mt-0.5">需求比對</div>
                </td>
                {days.map(dateStr => {
                  const stats = dailyStatsList[dateStr];
                  const d = getDemandRequirements(dateStr, staffingRules);
                  return (
                    <td key={dateStr} className="px-1 py-1.5 text-center border-r border-slate-100 font-mono text-xs">
                      <div className="font-semibold text-slate-800">{stats?.onDutySupervisors ?? 0}</div>
                      <div className="text-[10px] text-slate-400 border-t border-slate-100/50 mt-1 pt-0.5">
                        需 {stats?.supervisorDemand ?? d.supervisorDemand}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Supervisor Excess / Shortage Row */}
              <tr className="border-b border-slate-200 bg-slate-50/20">
                <td className="sticky left-0 bg-slate-50/90 z-10 px-3 py-2 border-r border-slate-200 font-medium text-slate-600 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="text-xs">主管超額/不足</div>
                  <div className="text-[9px] text-slate-400 font-normal">狀態回報</div>
                </td>
                {days.map(dateStr => {
                  const stats = dailyStatsList[dateStr];
                  const status = stats?.supervisorStatus || '正常';
                  let statusClass = 'text-slate-500';
                  
                  if (status.startsWith('不足')) {
                     statusClass = 'bg-red-50 text-red-600 font-semibold text-[10px] rounded-sm py-0.5 px-1 inline-block border border-red-100';
                  } else if (status.startsWith('超額')) {
                     statusClass = 'bg-emerald-50 text-emerald-600 font-medium text-[10px] rounded-sm py-0.5 px-1 inline-block border border-emerald-100';
                  } else {
                     statusClass = 'text-slate-400 text-[10px]';
                  }

                  return (
                    <td key={dateStr} className="px-1 py-1 text-center border-r border-slate-100">
                      <span className={statusClass}>{status}</span>
                    </td>
                  );
                })}
              </tr>

              {/* Reporters Stats Row */}
              <tr className="border-b border-slate-100">
                <td className="sticky left-0 bg-white z-10 px-3 py-2.5 border-r border-slate-200 font-medium text-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="text-xs">在崗記者人數</div>
                  <div className="text-[9px] text-slate-400 font-normal mt-0.5 font-sans">需求比對</div>
                </td>
                {days.map(dateStr => {
                  const stats = dailyStatsList[dateStr];
                  const d = getDemandRequirements(dateStr, staffingRules);
                  return (
                    <td key={dateStr} className="px-1 py-1.5 text-center border-r border-slate-100 font-mono text-xs">
                      <div className="font-semibold text-slate-800">{stats?.onDutyReporters ?? 0}</div>
                      <div className="text-[10px] text-slate-400 border-t border-slate-100/50 mt-1 pt-0.5">
                        需 {stats?.reporterDemand ?? d.reporterDemand}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Reporter Excess / Shortage Row */}
              <tr className="border-b border-slate-200 bg-slate-50/20">
                <td className="sticky left-0 bg-slate-50/90 z-10 px-3 py-2 border-r border-slate-200 font-medium text-slate-600 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="text-xs">記者超額/不足</div>
                  <div className="text-[9px] text-slate-400 font-normal font-sans">狀態回報</div>
                </td>
                {days.map(dateStr => {
                  const stats = dailyStatsList[dateStr];
                  const status = stats?.reporterStatus || '正常';
                  let statusClass = 'text-slate-500';
                  
                  if (status.startsWith('不足')) {
                     statusClass = 'bg-amber-50/80 text-amber-700 font-semibold text-[10px] rounded-sm py-0.5 px-1 inline-block border border-amber-100';
                  } else if (status.startsWith('超額')) {
                     statusClass = 'bg-emerald-50 text-emerald-600 font-medium text-[10px] rounded-sm py-0.5 px-1 inline-block border border-emerald-100';
                  } else {
                     statusClass = 'text-slate-400 text-[10px]';
                  }

                  return (
                    <td key={dateStr} className="px-1 py-1 text-center border-r border-slate-100">
                      <span className={statusClass}>{status}</span>
                    </td>
                  );
                })}
              </tr>

              {/* Scheduling Rule Conflict Warning Row */}
              <tr className="bg-slate-55/10">
                <td className="sticky left-0 bg-slate-100/90 z-10 px-3 py-3 border-r border-slate-200 font-semibold text-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.02)] flex items-center justify-between">
                  <span className="text-xs">排班規則衝突</span>
                </td>
                {days.map(dateStr => {
                  const stats = dailyStatsList[dateStr];
                  const conflicts = stats?.conflicts?.filter(c => c.type === 'supervisor' || c.type === 'reporter') || [];
                  const hasConflict = conflicts.length > 0;
                  
                  return (
                    <td 
                      key={dateStr} 
                      className={`px-1 py-1 text-center border-r border-slate-100 transition-colors ${
                        hasConflict ? 'bg-red-50' : ''
                      }`}
                    >
                      {hasConflict ? (
                        <div className="relative group flex items-center justify-center cursor-help">
                          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                          
                          {/* Rich Floating Tooltip */}
                          <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-900 text-white rounded-md p-3 text-[10.5px] text-left leading-relaxed shadow-lg z-50">
                            <div className="font-bold text-red-400 flex items-center gap-1 border-b border-slate-800 pb-1.5 mb-1.5">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              排班規則衝突警告
                            </div>
                            {conflicts.map((c, i) => (
                              <div key={i} className="mb-1 last:mb-0">
                                <div className="font-semibold text-slate-200">• {c.message}</div>
                                <div className="text-slate-400 scale-95 origin-left">{c.details}</div>
                              </div>
                            ))}
                            <div className="absolute w-2 h-2 bg-slate-900 rotate-45 bottom-[-4px] left-1/2 -translate-x-1/2"></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-mono">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Quick Footer Card Info */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>系統即時運作：在崗計入<strong>「上班」</strong>及<strong>「小夜」</strong>，特定日期需求覆蓋優先於平日/假日。</span>
        </div>
        <div className="text-indigo-600 font-semibold">
          💡 提示：按一下儲存格（包括主管或記者）即可更新班表，適合主管現場機動調整。
        </div>
      </div>
    </div>
  );
}
