import React, { useMemo } from 'react';
import { Employee, LeaveRequest, LeaveTypeDefinition } from '../types';
import { calculateMonthlySummary } from '../rulesEngine';
import { BarChart3, Download, TrendingUp, HelpCircle, FileSpreadsheet, Sliders, Calendar, UserCheck } from 'lucide-react';

interface MonthlySummaryProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveTypeDefinition[];
}

export default function MonthlySummary({
  employees,
  leaveRequests,
  leaveTypes,
}: MonthlySummaryProps) {
  
  const targetYear = 2026;
  
  // Calculate full matrix: employeeId -> { month -> factor total }
  const monthlyData = useMemo(() => {
    return calculateMonthlySummary(leaveRequests, employees, leaveTypes, targetYear);
  }, [leaveRequests, employees, leaveTypes, targetYear]);

  // Months 1 to 12 labels
  const months = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);

  // Compute individual annual totals
  const annualTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    employees.forEach(emp => {
      let sum = 0;
      months.forEach(m => {
        sum += (monthlyData[emp.id]?.[m] || 0);
      });
      totals[emp.id] = sum;
    });
    return totals;
  }, [employees, monthlyData, months]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    let totalTeamLeaveDays = 0;
    let maxLeaveDays = 0;
    let maxLeavePerson = '無';

    employees.forEach(emp => {
      const personalTotal = annualTotals[emp.id] || 0;
      totalTeamLeaveDays += personalTotal;

      if (personalTotal > maxLeaveDays) {
        maxLeaveDays = personalTotal;
        maxLeavePerson = emp.name;
      }
    });

    return {
      totalTeamLeaveDays,
      maxLeaveDays,
      maxLeavePerson
    };
  }, [employees, annualTotals]);

  // Export spreadsheet as CSV helper
  const handleExportCSV = () => {
    try {
      // Build CSV output string
      let csvContent = '\uFEFF'; // Add BOM for Chinese Excel readability

      // 1. Report title
      csvContent += `政治組排班假單統計 Excel 匯出表 (${targetYear}年度)\r\n`;
      csvContent += `匯出日期,${new Date().toLocaleString()}\r\n\r\n`;

      // 2. Statistics Headers
      csvContent += '成員姓名,身分角色,1月,2月,3月,4月,5月,6月,7月,8月,9月,10月,11月,12月,年總計(天)\r\n';

      // 3. Rows
      employees.forEach(emp => {
        let row = `"${emp.name}","${emp.role === 'Supervisor' ? '主管' : '記者'}"`;
        
        months.forEach(m => {
          const val = monthlyData[emp.id]?.[m] || 0;
          row += `,${val}`;
        });

        row += `,${annualTotals[emp.id] || 0}\r\n`;
        csvContent += row;
      });

      // 4. Trigger safe client side download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `政治組排班請假彙總表_${targetYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('匯出 CSV 失敗：' + e);
    }
  };

  return (
    <div className="space-y-6" id="monthly-summary-container">
      
      {/* Cards stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-medium">年度假單計算區間</div>
            <div className="text-sm font-semibold text-slate-700 font-mono">{targetYear} 年 1月 - 12月</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-medium">全體已核准特休日數</div>
            <div className="text-md font-extrabold text-slate-800 font-mono">
              {aggregateStats.totalTeamLeaveDays.toFixed(1)} <span className="text-xs font-normal text-slate-400">天</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-medium">小組內請假最多成員</div>
            <div className="text-sm font-semibold text-slate-800">
              {aggregateStats.maxLeavePerson} <span className="text-xs font-mono font-normal text-slate-400">({aggregateStats.maxLeaveDays.toFixed(1)} 天)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main interactive Table Sheet representation */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
        
        <div className="p-5 border-b border-slate-100 bg-linear-to-b from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-md font-display font-semibold text-slate-800 flex items-center gap-1.5 select-none">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              每月請假彙總 (Monthly Leave Summary)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              自動統計所有標記為 <strong>「Approved (已准假)」</strong> 的假單。系統已將不同的請假類型依據 Config 權重轉換為統計天數。
            </p>
          </div>

          <div>
            <button
              onClick={handleExportCSV}
              className="inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-all shadow-xs hover:shadow-sm"
              title="匯出資料為 Excel 可辨識的 CSV 格式"
            >
              <Download className="w-4 h-4" />
              匯出 Excel 表單 (.csv)
            </button>
          </div>
        </div>

        {/* Matrix Spreadsheet Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-semibold text-xs border-r border-slate-200 w-36">成員姓名</th>
                <th className="px-4 py-3 font-semibold text-xs border-r border-slate-200 w-24">角色身分</th>
                {months.map(m => (
                  <th key={m} className="px-2 py-3 text-center border-r border-slate-100 font-semibold text-xs font-mono">
                    {m}月
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-bold text-xs bg-indigo-50/50 text-indigo-900 w-28">年度總計 (天)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              
              {/* Supervisors */}
              {employees.filter(e => e.role === 'Supervisor').map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-200">{emp.name}</td>
                  <td className="px-4 py-3 border-r border-slate-200 text-xs">
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xs text-[10px]">主管</span>
                  </td>
                  {months.map(m => {
                    const val = monthlyData[emp.id]?.[m] || 0;
                    return (
                      <td key={m} className={`px-2 py-3 text-center border-r border-slate-100 font-mono text-xs ${val > 0 ? 'text-slate-800 font-semibold' : 'text-slate-350'}`}>
                        {val > 0 ? val.toFixed(1) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center bg-indigo-50/20 font-bold text-indigo-700 font-mono text-xs">
                    {(annualTotals[emp.id] || 0).toFixed(1)}
                  </td>
                </tr>
              ))}

              {/* Reporters */}
              {employees.filter(e => e.role === 'Reporter').map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-200">{emp.name}</td>
                  <td className="px-4 py-3 border-r border-slate-200 text-xs">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-xs text-[10px]">記者</span>
                  </td>
                  {months.map(m => {
                    const val = monthlyData[emp.id]?.[m] || 0;
                    return (
                      <td key={m} className={`px-2 py-3 text-center border-r border-slate-100 font-mono text-xs ${val > 0 ? 'text-slate-800 font-semibold' : 'text-slate-350'}`}>
                        {val > 0 ? val.toFixed(1) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center bg-indigo-50/20 font-bold text-indigo-700 font-mono text-xs">
                    {(annualTotals[emp.id] || 0).toFixed(1)}
                  </td>
                </tr>
              ))}

              {/* Monthly totals aggregator */}
              <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                <td colSpan={2} className="px-4 py-3 text-xs text-slate-600 border-r border-slate-200 uppercase tracking-wide">
                  團隊全體月計 (Team Total)
                </td>
                {months.map(m => {
                  let monthAbsences = 0;
                  employees.forEach(emp => {
                    monthAbsences += (monthlyData[emp.id]?.[m] || 0);
                  });
                  return (
                    <td key={m} className="px-2 py-3 text-center border-r border-slate-100 font-mono text-xs text-slate-700">
                      {monthAbsences > 0 ? monthAbsences.toFixed(1) : '-'}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center bg-indigo-100/50 font-extrabold text-indigo-950 font-mono text-xs">
                  {aggregateStats.totalTeamLeaveDays.toFixed(1)}
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Info detail footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-start gap-1.5 text-xs text-slate-500">
          <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <span>
            試算表機制：當在 <code>請假申請</code> 核准一份特休後，GAS 將分析出該假單於特定月份之跨天範圍日數，乘上計數因子再累加。所有運算於背景自動進行，完全無需人工按計數器排班累加。
          </span>
        </div>

      </div>

    </div>
  );
}
