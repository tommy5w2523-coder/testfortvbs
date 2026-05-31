import React, { useState } from 'react';
import { Employee, OptimalStaffing, ReporterCombinationConflict, LeaveTypeDefinition } from '../types';
import { Sliders, Plus, Trash2, HelpCircle, AlertTriangle, Shield, ShieldCheck, Check } from 'lucide-react';

interface ConfigRulesProps {
  employees: Employee[];
  staffingRules: OptimalStaffing[];
  supervisorConflicts: string[];
  reporterConflicts: ReporterCombinationConflict[];
  leaveTypes: LeaveTypeDefinition[];
  onUpdateStaffing: (rules: OptimalStaffing[]) => void;
  onUpdateSupervisorConflicts: (conflicts: string[]) => void;
  onUpdateReporterConflicts: (conflicts: ReporterCombinationConflict[]) => void;
  onUpdateLeaveTypes: (leaveTypes: LeaveTypeDefinition[]) => void;
}

export default function ConfigRules({
  employees,
  staffingRules,
  supervisorConflicts,
  reporterConflicts,
  leaveTypes,
  onUpdateStaffing,
  onUpdateSupervisorConflicts,
  onUpdateReporterConflicts,
  onUpdateLeaveTypes,
}: ConfigRulesProps) {
  
  // State for creating a custom Specific Date staffing rule
  const [newSpecDate, setNewSpecDate] = useState('2026-06-10');
  const [newSpecSup, setNewSpecSup] = useState(1);
  const [newSpecRep, setNewSpecRep] = useState(5);

  // State for creating a custom Reporter pairing conflict
  const [reporter1, setReporter1] = useState('亭廷');
  const [reporter2, setReporter2] = useState('豐瑋');

  // List of all reporters for drop-downs
  const reporterNames = employees.filter(e => e.role === 'Reporter').map(e => e.name);

  // Handles updating Weekday/Weekend staff numbers in the list
  const handleDemandChange = (id: string, field: 'supervisorDemand' | 'reporterDemand', value: number) => {
    const nextRules = staffingRules.map(r => {
      if (r.id === id) {
        return { ...r, [field]: Math.max(0, value) };
      }
      return r;
    });
    onUpdateStaffing(nextRules);
  };

  // Delete a specific date rule
  const handleDeleteStaffing = (id: string) => {
    onUpdateStaffing(staffingRules.filter(r => r.id !== id));
  };

  // Add specific date override staffing rule
  const handleAddSpecificDateStaffing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecDate) return;
    
    // Check if duplicate date
    const exists = staffingRules.some(r => r.dateType === 'specific' && r.specificDate === newSpecDate);
    if (exists) {
      alert('該特定日期配置已存在！可以直接進行修改或刪除。');
      return;
    }

    const newRule: OptimalStaffing = {
      id: `st_spec_${Date.now()}`,
      dateType: 'specific',
      specificDate: newSpecDate,
      supervisorDemand: newSpecSup,
      reporterDemand: newSpecRep
    };

    onUpdateStaffing([...staffingRules, newRule]);
  };

  // Delete reporter conflict pairing
  const handleDeleteReporterConflict = (id: number) => {
    onUpdateReporterConflicts(reporterConflicts.filter(r => r.id !== id));
  };

  // Add reporter conflict pairing
  const handleAddReporterConflict = (e: React.FormEvent) => {
    e.preventDefault();
    if (reporter1 === reporter2) {
      alert('互斥組員不可選取相同姓名！');
      return;
    }

    // Check if pairing already exists in any order
    const exists = reporterConflicts.some(r => 
      (r.members[0] === reporter1 && r.members[1] === reporter2) ||
      (r.members[0] === reporter2 && r.members[1] === reporter1)
    );

    if (exists) {
      alert('該記者互斥配對已存在！');
      return;
    }

    const nextId = reporterConflicts.length > 0 ? Math.max(...reporterConflicts.map(r => r.id)) + 1 : 1;
    const newRule: ReporterCombinationConflict = {
      id: nextId,
      members: [reporter1, reporter2]
    };

    onUpdateReporterConflicts([...reporterConflicts, newRule]);
  };

  // Handle factor change for leave types
  const handleFactorChange = (typeName: string, factor: number) => {
    const nextTypes = leaveTypes.map(lt => {
      if (lt.typeName === typeName) {
        return { ...lt, countingFactor: Math.min(1.0, Math.max(0.0, factor)) };
      }
      return lt;
    });
    onUpdateLeaveTypes(nextTypes);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="config-rules-container">
      
      {/* SECTION 1: Staffing Configuration */}
      <div className="space-y-6">
        
        {/* Staffing Config */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-linear-to-b from-slate-50 to-white">
            <h3 className="text-sm font-display font-semibold text-slate-800 flex items-center gap-1.5 select-none">
              <Shield className="w-4.5 h-4.5 text-indigo-600" />
              最佳人員配置規則 (A1:C7 Optimal Staffing)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              定義不同日期的基本出勤人數需求。特定日期規則設定後之優先權高於平日與假日。
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            
            {/* Staffing table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 uppercase tracking-tight">
                    <th className="p-2 border-r border-slate-100">日期類型 (Date Type)</th>
                    <th className="p-2 border-r border-slate-100 text-center">主管需求 (Sup)</th>
                    <th className="p-2 border-r border-slate-100 text-center">記者需求 (Rep)</th>
                    <th className="p-2 text-center">管理選項</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {staffingRules.map((rule) => {
                    const isPattern = rule.dateType === 'weekday' || rule.dateType === 'weekend';
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/50">
                        <td className="p-2 font-medium text-slate-700">
                          {rule.dateType === 'weekday' && '平日 (Weekday)'}
                          {rule.dateType === 'weekend' && '假日 (Weekend/Holiday)'}
                          {rule.dateType === 'specific' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm font-semibold font-mono">
                              特定:{rule.specificDate}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-slate-100">
                          <input
                            type="number"
                            value={rule.supervisorDemand}
                            onChange={(e) => handleDemandChange(rule.id, 'supervisorDemand', parseInt(e.target.value) || 0)}
                            className="w-12 text-center border border-slate-200 rounded-md font-mono py-0.5 bg-slate-50/50 focus:bg-white"
                          />
                        </td>
                        <td className="p-2 text-center border-r border-slate-100">
                          <input
                            type="number"
                            value={rule.reporterDemand}
                            onChange={(e) => handleDemandChange(rule.id, 'reporterDemand', parseInt(e.target.value) || 0)}
                            className="w-12 text-center border border-slate-200 rounded-md font-mono py-0.5 bg-slate-50/50 focus:bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {isPattern ? (
                            <span className="text-[10px] text-slate-400 italic">基礎預設</span>
                          ) : (
                            <button
                              onClick={() => handleDeleteStaffing(rule.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-all cursor-pointer"
                              title="刪除特定日期規則"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add specific date staffing form */}
            <form onSubmit={handleAddSpecificDateStaffing} className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100/50 space-y-3">
              <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                新增特定日期出勤需求覆蓋
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-1">日期 (Date)</label>
                  <input
                    type="date"
                    value={newSpecDate}
                    onChange={(e) => setNewSpecDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1 font-mono text-[11px] bg-white text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-1">主管 (Sup)</label>
                  <input
                    type="number"
                    value={newSpecSup}
                    onChange={(e) => setNewSpecSup(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-slate-200 rounded-md px-2 py-1 font-mono text-[11px] bg-white text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-1">記者 (Rep)</label>
                  <input
                    type="number"
                    value={newSpecRep}
                    onChange={(e) => setNewSpecRep(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-slate-200 rounded-md px-2 py-1 font-mono text-[11px] bg-white text-slate-700"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10.5px] font-medium py-1 px-3 transition-all flex items-center justify-center gap-1"
              >
                新增此日期覆蓋配置
              </button>
            </form>

          </div>
        </div>

        {/* SECTION 2: Supervisor Leave Conflict Definition */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-linear-to-b from-slate-50 to-white">
            <h3 className="text-sm font-display font-semibold text-slate-800 flex items-center gap-1.5 select-none">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
              主管互斥休假規則 (A9:B10 Supervisor Conflict)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              設定不允許在同一天共同休假的領導職名單。
            </p>
          </div>

          <div className="p-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 space-y-2 select-none">
              <div className="font-bold flex items-center gap-1 text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                當前互斥主管群：
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {supervisorConflicts.map(name => (
                  <span key={name} className="px-2.5 py-1 bg-white border border-red-200 rounded-md font-bold text-red-700 text-xs flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {name} (對等主管)
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-red-600 font-medium scale-95 origin-left pt-0.5">
                ※ 系統全天候監控這 {supervisorConflicts.length} 位主管。當大於或等於2人同日排定休假時，將在排班表與假單審查中阻斷或標記警報。
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* COLUMN 2: Reporter Combos and Leave Factor definitions */}
      <div className="space-y-6">

        {/* Reporter Combination Leaves */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-linear-to-b from-slate-50 to-white">
            <h3 className="text-sm font-display font-semibold text-slate-800 flex items-center gap-1.5 select-none">
              <Sliders className="w-4.5 h-4.5 text-indigo-600" />
              記者組合互斥休假定義 (A12:C16 Reporter Combos)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              避免職責相近或專業配對的關鍵組員於同一天共同休假，防止前線採訪戰力空窗。
            </p>
          </div>

          <div className="p-4 space-y-4">
            
            {/* List reporter combos */}
            <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50/50 rounded-lg p-2 border border-slate-100">
              {reporterConflicts.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs italic">
                  暫無設置組員互斥組合配對
                </div>
              ) : (
                reporterConflicts.map(combo => (
                  <div key={combo.id} className="bg-white p-2.5 rounded-md border border-slate-200 text-xs flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-1 bg-slate-100 text-slate-500 rounded-sm font-bold">
                        組合 #{combo.id}
                      </span>
                      <span className="font-medium text-slate-800">
                        {combo.members[0]} & {combo.members[1]}
                      </span>
                      <span className="text-[9.5px] text-slate-400">
                        不可同時休假
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteReporterConflict(combo.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-all cursor-pointer"
                      title="刪除互斥配對"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form to insert new combo */}
            <form onSubmit={handleAddReporterConflict} className="p-3 bg-linear-to-r from-slate-50 to-white rounded-lg border border-slate-200 space-y-3">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 select-none">
                <Plus className="w-4 h-4 text-slate-600" />
                新增成員互斥休假配對
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-1">成員 A (Member 1)</label>
                  <select
                    value={reporter1}
                    onChange={(e) => setReporter1(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                  >
                    {reporterNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-1">成員 B (Member 2)</label>
                  <select
                    value={reporter2}
                    onChange={(e) => setReporter2(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                  >
                    {reporterNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[10.5px] font-medium py-1 px-3 transition-all flex items-center justify-center gap-1"
              >
                新增互斥對應組合
              </button>
            </form>

          </div>
        </div>

        {/* Leave Type Definitions */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-linear-to-b from-slate-50 to-white">
            <h3 className="text-sm font-display font-semibold text-slate-800 flex items-center gap-1.5 select-none">
              <Sliders className="w-4.5 h-4.5 text-indigo-600" />
              請假類型定義與計算因子 (A18:B22 Leave Type Factor)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              定義不同假的扣除權重，計入每月請假天數彙總。
            </p>
          </div>

          <div className="p-4">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <th className="p-2 border-r border-slate-50">請假類型名稱</th>
                  <th className="p-2 text-center">計算因子 (Counting Factor)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {leaveTypes.map((type) => (
                  <tr key={type.typeName} className="hover:bg-slate-50/50">
                    <td className="p-2 font-medium text-slate-700">{type.typeName}</td>
                    <td className="p-2 text-center flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1.0"
                        value={type.countingFactor}
                        onChange={(e) => handleFactorChange(type.typeName, parseFloat(e.target.value) || 0)}
                        className="w-16 text-center border border-slate-200 rounded-md font-mono py-0.5 bg-slate-50/50 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-400">
                        {type.countingFactor === 1.0 ? '(全天假)' : type.countingFactor === 0.5 ? '(半天假)' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 bg-indigo-50/40 border border-indigo-100/50 p-2.5 rounded-md text-[10px] text-indigo-800 italic leading-relaxed">
              💡 自訂計數因子：修改特定因子的權重將立刻重新校正「每月請假彙總」內所有歷史核准假單的天數，適合臨時微調計算權重。
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
