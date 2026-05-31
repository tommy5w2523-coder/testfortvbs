import React, { useState } from 'react';
import { Employee, LeaveRequest, ShiftType, OptimalStaffing, ReporterCombinationConflict, LeaveTypeDefinition } from '../types';
import { simulateLeaveRequestImpact, checkDailySchedule, isWeekend } from '../rulesEngine';
import { 
  FileText, Check, X, ShieldAlert, BadgeHelp, HelpCircle, 
  Sparkles, Calendar, ClipboardCheck, Phone, CheckCircle, Eye, AlertTriangle 
} from 'lucide-react';

interface LeaveRequestFormProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  schedule: any[];
  staffingRules: OptimalStaffing[];
  supervisorConflicts: string[];
  reporterConflicts: ReporterCombinationConflict[];
  leaveTypes: LeaveTypeDefinition[];
  onSubmitRequest: (newRequest: Omit<LeaveRequest, 'id' | 'timestamp' | 'status'>) => void;
  onApproveRequest: (id: string, approverName: string) => void;
  onRejectRequest: (id: string, approverName: string, remarks: string) => void;
}

export default function LeaveRequestForm({
  employees,
  leaveRequests,
  schedule,
  staffingRules,
  supervisorConflicts,
  reporterConflicts,
  leaveTypes,
  onSubmitRequest,
  onApproveRequest,
  onRejectRequest,
}: LeaveRequestFormProps) {
  
  // Simulated form inputs
  const [applicantName, setApplicantName] = useState('亭廷');
  const [appType, setAppType] = useState<'請假' | '排班調整'>('請假');
  const [startDate, setStartDate] = useState('2026-06-15');
  const [endDate, setEndDate] = useState('2026-06-15');
  const [leaveTypeName, setLeaveTypeName] = useState('特休(全天)');
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('0912-345678');
  
  // What-If analysis simulation results local storage/state
  const [simulatingReqId, setSimulatingReqId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Success Feedback
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Re-usable notification trigger
  const triggerNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('請填寫完整請假日期！');
      return;
    }
    if (!reason.trim()) {
      alert('請填寫請假原因以供主管審查！');
      return;
    }

    onSubmitRequest({
      applicantName,
      startDate,
      endDate,
      leaveType: appType === '請假' ? leaveTypeName : '排班調整',
      reason,
      contactPhone: phone,
    });

    setReason('');
    triggerNotification(`🎉 表單送出成功！已模擬 Google Forms 自動傳入 Sheets「請假申請」分頁並標記狀態為 [Pending]。同時發送通知給主管「啟明」及「書維」！`);
  };

  const runSimulation = (req: LeaveRequest) => {
    const impact = simulateLeaveRequestImpact(
      req,
      schedule,
      employees,
      staffingRules,
      supervisorConflicts,
      reporterConflicts
    );
    
    setSimulatingReqId(req.id);
    setSimulationResult({
      request: req,
      ...impact
    });
  };

  const handleApprove = (req: LeaveRequest) => {
    onApproveRequest(req.id, '書維'); // simulates supervisor "Shu-Wei" approving
    setSimulatingReqId(null);
    setSimulationResult(null);
    triggerNotification(`📬 已核准 ${req.applicantName} 的假單！班表已自動同步更新為【休假】，並已發信通知當事人：${req.applicantName} (Chang.suvaky@gmail.com)`);
  };

  const handleReject = (req: LeaveRequest) => {
    const rmk = prompt('請輸入駁回原因：', '因當日政治組有重大選舉活動，組內記者人數吃緊，非常抱歉，請協調其他平日休假。');
    if (rmk === null) return; // cancelled
    
    onRejectRequest(req.id, '啟明', rmk); // simulates supervisor "Qi-Ming" rejecting
    setSimulatingReqId(null);
    setSimulationResult(null);
    triggerNotification(`📬 已駁回 ${req.applicantName} 的假單，並發送 Gmail 駁回理由通知給：${req.applicantName}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="leave-request-container">
      
      {/* Dynamic Toast Alerts */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-slate-900 text-white rounded-lg shadow-xl p-4 border-l-4 border-emerald-500 animate-bounce flex items-start gap-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-xs text-slate-200">系統精靈通知 (GAS Simulator)</div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* COLUMN 1: Google Form Simulator (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          {/* Form Header mimicking Google Form Purple Style but elegant */}
          <div className="h-2.5 bg-indigo-600 w-full"></div>
          <div className="p-5 border-b border-slate-100 bg-linear-to-b from-indigo-50/20 to-white">
            <h3 className="text-md font-display font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              政治組請假申請 (Google Forms 模擬)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              模擬政治組組員在手機端提交假單。點選「送出」將會即時將資料序列化並傳遞給 GAS 處理。
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
            
            {/* 姓名 Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                1. 姓名 (Name) <span className="text-red-500">*</span>
              </label>
              <select 
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 bg-slate-50 font-medium"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.role === 'Supervisor' ? '主管' : '記者'})
                  </option>
                ))}
              </select>
            </div>

            {/* 申請類別 Radio */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                2. 申請類別 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="appType"
                    checked={appType === '請假'}
                    onChange={() => setAppType('請假')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  請假申請 (Leave Request)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="appType"
                    checked={appType === '排班調整'}
                    onChange={() => setAppType('排班調整')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  排班調整
                </label>
              </div>
            </div>

            {appType === '請假' && (
              <>
                {/* 請假日期 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      請假開始日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min="2026-06-01"
                      max="2026-06-30"
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        // Make endDate match or be higher
                        if (new Date(e.target.value) > new Date(endDate)) {
                          setEndDate(e.target.value);
                        }
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-700 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      請假結束日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max="2026-06-30"
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-700 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* 請假類型 Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    請假類型 (Leave Type) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={leaveTypeName}
                    onChange={(e) => setLeaveTypeName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-700 font-medium"
                  >
                    {leaveTypes.map(lt => (
                      <option key={lt.typeName} value={lt.typeName}>
                        {lt.typeName} (權重: {lt.countingFactor})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* 請假原因 Paragraph */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                請假原因 (Reason) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：需返鄉處理私事、陪同家人看病、安排旅遊行程..."
                rows={3}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-700"
                required
              />
            </div>

            {/* 聯繫電話 Short Answer */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                應急聯繫電話 (Contact Phone)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx-xxxxxx"
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-700 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer py-2 px-4 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              提交假單表單
            </button>

          </form>
        </div>

        {/* Short info card explaining pre-checks */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-xs text-amber-800 leading-relaxed">
          <div className="font-semibold flex items-center gap-1 text-amber-900 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            自動前通報技術說明
          </div>
          在實務 GAS 中，<code>onFormSubmit</code> 將會在接收表單後，在 sheets 插入新列（預設狀態 Pending），接著立刻發出含<strong>主管快捷核准面板</strong>的郵件通知給管理員。
        </div>

      </div>

      {/* COLUMN 2: Supervisor Decision Board Component (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Supervisor Core Interactive dashboard panel */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-linear-to-r from-slate-50 to-white">
            <div>
              <h3 className="text-sm font-display font-semibold text-slate-800 flex items-center gap-1.5">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                智慧審批決策支援面板 (Supervisor Decision Dashboard)
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                管理並審核組員待准假的請假申請。使用「What-If 影響預覽」功能可由防衝突邏輯模擬新假單批准後的衝擊。
              </p>
            </div>
          </div>

          {/* Pending List */}
          <div className="p-5">
            <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">
              待處理假單 ({leaveRequests.filter(r => r.status === 'Pending').length})
            </h4>
            
            {leaveRequests.filter(r => r.status === 'Pending').length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                🎉 太棒了！目前暫無待處理的請假申請單。您可以由左側表單新增並送出來測試。
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.filter(r => r.status === 'Pending').map((req) => {
                  const isSimulating = simulatingReqId === req.id;
                  
                  return (
                    <div 
                      key={req.id} 
                      className={`border rounded-lg overflow-hidden transition-all ${
                        isSimulating ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Leaf Info Header Header */}
                      <div className="p-4 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{req.applicantName}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xs scale-95">{req.leaveType}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({req.timestamp})</span>
                          </div>
                          <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>請假區間：</span>
                            <span className="font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded-sm border border-slate-200">
                              {req.startDate}
                            </span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded-sm border border-slate-200">
                              {req.endDate}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div>
                          <span className="px-2.5 py-1 rounded-sm bg-amber-50 border border-amber-200 text-amber-700 font-medium scale-95 inline-block select-none animate-pulse">
                            待審批 (Pending)
                          </span>
                        </div>
                      </div>

                      {/* Content Detail */}
                      <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-700 space-y-3">
                        <div>
                          <span className="text-slate-400 font-medium font-sans">請假原因：</span>
                          <span className="text-slate-800 bg-slate-50 px-2 py-1 rounded-sm border border-slate-100 inline-block mt-1 w-full italic">
                            「{req.reason}」
                          </span>
                        </div>
                        
                        {req.contactPhone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            緊急聯繫電話: <span className="font-mono text-slate-700">{req.contactPhone}</span>
                          </div>
                        )}

                        {/* Decision Bar & Simulator trigger */}
                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => runSimulation(req)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-indigo-500" />
                              What-If 影響預覽
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleReject(req)}
                              className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-md transition-all flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              駁回
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(req)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-xs hover:shadow-md flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              批准核可
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SIMULATION AREA (WHAT-IF CONTAINER) */}
                      {isSimulating && simulationResult && (
                        <div className="p-4 bg-indigo-50/40 border-t border-indigo-100 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2 mb-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                              What-If 假單衝擊分析結果 (Leave Approval Pre-Analysis)
                            </div>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-sm font-mono scale-90">
                              GAS RAM Simulation Mode
                            </span>
                          </div>

                          <div className="space-y-2">
                            {simulationResult.affectedDates.map((dateStr: string) => {
                              const stats = simulationResult.simulatedDailyStats[dateStr];
                              const origStats = simulationResult.originalDailyStats[dateStr];
                              if (!stats) return null;

                              const isConflictNow = stats.conflicts.length > 0;
                              
                              return (
                                <div key={dateStr} className="p-3 bg-white border border-indigo-200 rounded-md text-xs space-y-2.5">
                                  {/* Date header */}
                                  <div className="flex items-center justify-between font-semibold border-b border-slate-100 pb-1 text-[11px] text-slate-700">
                                    <span>日期：{dateStr} ({isWeekend(dateStr) ? '週末假日' : '平日'})</span>
                                    <span className={`px-2 py-0.5 rounded-sm text-[10px] ${
                                      isConflictNow 
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' 
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    }`}>
                                      {isConflictNow ? '⚠️ 有潛在調度衝突' : '✅ 排班安全良好'}
                                    </span>
                                  </div>

                                  {/* Human outcome description */}
                                  <div className="space-y-1.5 leading-relaxed">
                                    {/* Staffing Compare */}
                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 py-1 bg-slate-50/80 rounded-xs px-2 select-none">
                                      <div>
                                        在崗主管：<span className="font-bold text-slate-800">{origStats.onDutySupervisors}人</span> ➔ 退為 <span className="font-extrabold text-indigo-600">{stats.onDutySupervisors}人</span> (需求: {stats.supervisorDemand}人)
                                      </div>
                                      <div>
                                        在崗記者：<span className="font-bold text-slate-800">{origStats.onDutyReporters}人</span> ➔ 退為 <span className="font-extrabold text-indigo-600">{stats.onDutyReporters}人</span> (需求: {stats.reporterDemand}人)
                                      </div>
                                    </div>

                                    {/* Warnings list */}
                                    {isConflictNow ? (
                                      <div className="space-y-1 mt-1">
                                        {stats.conflicts.map((c: any, ci: number) => {
                                          const severityColor = c.severity === 'error' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200';
                                          return (
                                            <div key={ci} className={`p-2 border rounded-sm flex items-start gap-1.5 ${severityColor}`}>
                                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                                              <div>
                                                <div className="font-bold text-xs">{c.message}</div>
                                                <div className="text-[10px] opacity-90 mt-0.5">{c.details}</div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-emerald-700 text-[11px] font-medium flex items-center gap-1 select-none">
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                        此假單經核可後，當日在崗人數（主管 {stats.onDutySupervisors}人，記者 {stats.onDutyReporters}人）均未低於 Config 標準，且無違反任何人互斥配對。推薦「准假」！
                                      </p>
                                    )}

                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Simulated Decision helper advice */}
                          <div className="mt-3 text-[10.5px] italic text-indigo-800 bg-indigo-50 border border-indigo-100 p-2.5 rounded-md flex items-start gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>
                              決策輔助：<strong>What-If 技術</strong>可全自動在記憶體內模擬班表變更後的規則結果，保護 supervisors 避免核准考勤後造成現場指揮力真空或違反複雜配對。
                            </span>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Approved / Rejected History Logs */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                已處理假單紀錄 (Sheet Responses Log)
              </h4>
              
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                {leaveRequests.filter(r => r.status !== 'Pending').length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs italic">
                    暫無歷史派班審核紀錄
                  </div>
                ) : (
                  leaveRequests.filter(r => r.status !== 'Pending').slice().reverse().map((req) => (
                    <div 
                      key={req.id} 
                      className="bg-white border border-slate-200 rounded-md p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">{req.applicantName}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-xs scale-90">{req.leaveType}</span>
                          <span className="text-[10px] text-slate-400">{req.startDate} 至 {req.endDate}</span>
                        </div>
                        <div className="text-slate-500 italic scale-95 origin-left">「{req.reason}」</div>
                        {req.approver && (
                          <div className="text-[10.5px] text-slate-400">
                            審核人: <span className="text-slate-600 font-medium">{req.approver}</span> 於 <span className="font-mono">{req.approvalTime}</span>
                          </div>
                        )}
                        {req.remarks && (
                          <div className="text-[10px] text-indigo-600 bg-indigo-50/40 px-1.5 py-0.5 rounded-xs mt-0.5 inline-block border border-indigo-50/50">
                            備註: {req.remarks}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {req.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full font-semibold scale-90 select-none">
                            <Check className="w-3 h-3" /> 已准假
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-full font-semibold scale-90 select-none">
                            <X className="w-3.5 h-3.5" /> 已駁回
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
