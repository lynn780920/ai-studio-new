import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, UserRole, TrackingRow, ERPRawRow, UserRoleRow } from './types';
import { sheetService } from './services/sheetService';

// Icons
import { 
  Search, FileSpreadsheet, LogOut, User as UserIcon, 
  UploadCloud, AlertCircle, CheckCircle, RefreshCw, ChevronDown, ChevronRight, Layers, 
  CheckSquare, Square, LogIn, Menu, Trash2, Box, Factory,
  Download, Archive, RotateCcw, PackageCheck, PanelLeftClose, PanelLeftOpen,
  Calendar, Briefcase, Shield, Users, ArrowRightCircle, Check, X, Maximize2
} from 'lucide-react';

declare global {
  interface Window {
    XLSX: any;
  }
}

// --- UTILS ---
const formatDateForInput = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  if (!isNaN(Number(dateStr)) && Number(dateStr) > 20000) {
      const date = new Date((Number(dateStr) - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
  }
  const cleanStr = dateStr.trim();
  if (cleanStr.includes('/')) {
     const parts = cleanStr.split('/');
     if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
     if (parts[2].length === 4) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
  return '';
};

const CompactDateInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
        if('showPicker' in HTMLInputElement.prototype) {
            try { inputRef.current.showPicker(); } catch(e) {}
        }
    }
  }, [isEditing]);

  let display = '-';
  if (value) {
     const normalized = formatDateForInput(value);
     if (normalized) {
        const parts = normalized.split('-');
        if (parts.length === 3) display = `${parts[1]}/${parts[2]}`;
        else display = value;
     } else {
        display = value;
     }
  }

  if (isEditing) {
    return (
        <input 
            ref={inputRef}
            type="date" 
            className="border border-blue-400 rounded px-1 w-full bg-white h-10 text-base shadow-sm" 
            value={formatDateForInput(value)} 
            onChange={e => onChange(e.target.value)} 
            onBlur={() => setIsEditing(false)}
        />
    );
  }

  return (
    <div 
        onClick={() => setIsEditing(true)} 
        className={`border rounded px-2 h-10 w-full flex items-center justify-center text-base font-medium cursor-pointer hover:bg-slate-50 transition-colors ${value ? 'text-slate-900 bg-white border-slate-300' : 'text-slate-400 bg-slate-50 border-slate-200'}`}
        title={value}
    >
        {display}
    </div>
  );
};

// --- COMPONENTS ---

const LoginScreen = ({ onLogin }: { onLogin: (username: string) => Promise<string | null> }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await onLogin(username);
    if (err) setError(err);
    setLoading(false);
  };

  const handleReset = () => {
    if (confirm('確定要重置系統資料嗎？所有新增的工單與人員將被清除。')) {
      localStorage.removeItem('mock_sheet_db');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200">
            <FileSpreadsheet className="text-white w-10 h-10" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-center text-slate-800 mb-2 tracking-tight">CloudSheet ERP</h1>
        <p className="text-center text-slate-500 mb-10 text-lg">生產排程缺料追蹤系統</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-base font-bold text-slate-700 mb-2">使用者帳號</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border border-slate-300 rounded-xl px-5 py-3.5 text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" placeholder="輸入帳號" />
          </div>
          {error && (<div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-100"><AlertCircle size={20} />{error}</div>)}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]">
            {loading ? <RefreshCw className="animate-spin" /> : <LogIn size={20} />} 登入系統
          </button>
        </form>
        <div className="mt-10 pt-8 border-t border-slate-100 space-y-4">
           <p className="text-sm text-center text-slate-400">提示: <b>請使用分配的帳號登入</b></p>
           <button onClick={handleReset} className="w-full text-sm text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 py-2"><Trash2 size={16}/> 重置系統資料 (Reset DB)</button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ user, onLogout, onToggleMenu }: { user: User, onLogout: () => void, onToggleMenu: () => void }) => {
  const getRoleName = (role: UserRole) => {
    switch(role) {
      case UserRole.PURCHASER: return '採購人員';
      case UserRole.SCHEDULER: return '排程人員';
      case UserRole.BUSINESS: return '業管 Team';
      case UserRole.ADMIN: return '系統管理員';
      default: return role;
    }
  };
  const getRoleColor = (role: UserRole) => {
     switch(role) {
      case UserRole.PURCHASER: return 'bg-green-100 text-green-800 border-green-200';
      case UserRole.SCHEDULER: return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserRole.BUSINESS: return 'bg-orange-100 text-orange-800 border-orange-200';
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-slate-100';
    }
  };
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onToggleMenu} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Menu size={28} /></button>
          <div className="bg-blue-600 p-2 rounded-xl hidden md:block shadow-sm"><FileSpreadsheet className="text-white w-6 h-6" /></div>
          <span className="font-extrabold text-2xl text-slate-800 tracking-tight">CloudSheet ERP</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-full text-sm font-bold border shadow-sm ${getRoleColor(user.role)}`}>{getRoleName(user.role)}</div>
          <div className="hidden sm:flex flex-col items-end"><span className="text-lg font-bold text-slate-700">{user.username}</span></div>
          <button onClick={onLogout} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="登出"><LogOut size={24} /></button>
        </div>
      </div>
    </header>
  );
};

// --- MODAL & TRACKING VIEW ---

const TrackingView = ({ user }: { user: User }) => {
  const isBusiness = user.role === UserRole.BUSINESS;
  const isScheduler = user.role === UserRole.SCHEDULER || user.role === UserRole.ADMIN;
  const isPurchaser = user.role === UserRole.PURCHASER || user.role === UserRole.ADMIN;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  const [data, setData] = useState<TrackingRow[]>([]);
  // MODAL STATE: Replacing inline expansion
  const [activeModal, setActiveModal] = useState<{model: string, stage: string} | null>(null);

  // COLUMN WIDTH STATE (Persisted for Modal)
  const [colWidths, setColWidths] = useState({
    part: 400,
    qty: 100,
    supplier: 200,
    reply: 140,
    remark: 250
  });

  const handleResizeStart = (e: React.MouseEvent, colKey: keyof typeof colWidths) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colKey];
    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.pageX;
      const diff = currentX - startX;
      setColWidths(prev => ({ ...prev, [colKey]: Math.max(50, startWidth + diff) }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const fetchData = async () => {
    const results = await sheetService.searchTracking('');
    setData(results);
  };

  useEffect(() => { fetchData(); }, [viewMode]);

  const updateRow = async (rowId: string, updates: Partial<TrackingRow>) => {
    setData(prev => prev.map(r => r.id === rowId ? { ...r, ...updates } : r));
    if ('purchaserReplyDate' in updates) await sheetService.updateDeliveryDate(rowId, updates.purchaserReplyDate as string);
    if ('purchaserRemark' in updates) await sheetService.updatePurchaserRemark(rowId, updates.purchaserRemark as string);
    await fetchData();
  };

  const updateStageDate = async (workOrder: string, stage: string, field: 'oqcDate', val: string) => {
    await sheetService.updateStageDate(workOrder, stage, field, val);
    await fetchData();
  };

  const toggleStageReady = async (workOrder: string, stage: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    await sheetService.updateStageReady(workOrder, stage, newStatus);
    await fetchData();
  };

  const toggleArchiveModel = async (modelName: string, archive: boolean) => {
      setData(prevData => {
         return prevData.map(r => {
             if (r.model.trim().toLowerCase() === modelName.trim().toLowerCase()) {
                 return { ...r, isArchived: archive };
             }
             return r;
         });
      });
      await sheetService.archiveModel(modelName, archive);
  };

  const handleExport = () => {
    const exportData = filteredData.map(row => ({
      '機種': row.model, '工單': row.workOrder, '製程': row.stage, '外包': row.vendor, 
      '生產日期': row.productionDate, '品號': row.productPartNumber,
      '料號': row.partNumber, '品名': row.partName, '規格': row.specification, '供應商': row.supplier,
      '欠料數': row.shortageQty,
      '客驗/出貨日': row.oqcDate, '採購回覆': row.purchaserReplyDate, '備註': row.purchaserRemark,
      '狀態': row.status
    }));
    const ws = window.XLSX.utils.json_to_sheet(exportData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Report");
    window.XLSX.writeFile(wb, `ERP_Export.xlsx`);
  };

  const availableVendors = useMemo(() => Array.from(new Set(data.map(r => r.vendor).filter(Boolean))).sort(), [data]);
  const availableSuppliers = useMemo(() => Array.from(new Set(data.map(r => r.supplier).filter(Boolean))).sort(), [data]);
  const availableMonths = useMemo(() => {
     const months = new Set<string>();
     data.forEach(r => {
        if (r.oqcDate && r.oqcDate.length >= 7) {
            months.add(r.oqcDate.substring(0, 7));
        }
     });
     return Array.from(months).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (viewMode === 'active' && row.isArchived) return false;
      if (viewMode === 'archived' && !row.isArchived) return false;
      if (monthFilter !== 'All') {
          if (!row.oqcDate || !row.oqcDate.startsWith(monthFilter)) return false;
      }
      const matchSearch = row.workOrder.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.model.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'All' || row.status === statusFilter;
      const matchVendor = vendorFilter === 'All' || row.vendor === vendorFilter;
      const matchSupplier = supplierFilter === 'All' || row.supplier === supplierFilter;
      return matchSearch && matchStatus && matchVendor && matchSupplier;
    });
  }, [data, searchTerm, statusFilter, vendorFilter, supplierFilter, monthFilter, viewMode]);

  const groupedData = useMemo(() => {
    const groups: Record<string, TrackingRow[]> = {};
    filteredData.forEach(row => {
      if (!groups[row.model]) groups[row.model] = [];
      groups[row.model].push(row);
    });
    return groups;
  }, [filteredData]);

  const getStageStatus = (rows: TrackingRow[]) => {
    if (rows.length === 0) return 'ok'; 
    const realShortages = rows.filter(r => r.shortageQty > 0);
    if (realShortages.length === 0) return 'ok';
    if (realShortages.every(r => r.status === 'Ready' || r.isMaterialReady)) return 'ok';
    if (realShortages.some(r => r.status === 'Late')) return 'late';
    return 'pending';
  };

  // --- DETAIL MODAL ---
  const renderDetailModal = () => {
    if (!activeModal) return null;
    const { model, stage } = activeModal;
    const rows = groupedData[model]?.filter(r => r.stage === stage) || [];
    const repRow = rows[0];
    if (!repRow) return null;

    const realShortages = rows.filter(r => r.shortageQty > 0);
    const isReady = rows.length > 0 && rows.every(r => r.isMaterialReady);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-slate-200">
           {/* Modal Header */}
           <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start shrink-0">
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-sm">{model}</span>
                    <span className="text-slate-400 font-bold">/</span>
                    <h2 className="text-3xl font-extrabold text-slate-800">{stage} 詳細欠料表</h2>
                 </div>
                 <div className="flex items-center gap-6 mt-2">
                    <div className="flex items-center gap-2 text-slate-600">
                       <Box size={20}/> <span className="font-mono font-bold text-lg">{repRow.workOrder}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                       <Factory size={18}/> <span className="font-bold">{repRow.vendor}</span>
                    </div>
                 </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"><X size={28}/></button>
           </div>

           {/* Modal Body - Scrollable Table */}
           <div className="flex-1 overflow-auto bg-slate-50 p-6">
              <table className="w-full text-left table-fixed bg-white border border-slate-200 shadow-md rounded-lg overflow-hidden">
                <thead className="text-slate-600 font-bold text-lg border-b-2 border-slate-200 bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-4 pl-6 relative group select-none hover:bg-slate-200 transition-colors border-r border-slate-200" style={{ width: colWidths.part }}>
                      料號 / 品名
                      <div onMouseDown={(e) => handleResizeStart(e, 'part')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-10 transition-colors"/>
                    </th>
                    <th className="p-4 text-center relative group select-none hover:bg-slate-200 transition-colors border-r border-slate-200" style={{ width: colWidths.qty }}>
                      數量
                      <div onMouseDown={(e) => handleResizeStart(e, 'qty')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-10 transition-colors"/>
                    </th>
                    <th className="p-4 relative group select-none hover:bg-slate-200 transition-colors border-r border-slate-200" style={{ width: colWidths.supplier }}>
                      供應商
                      <div onMouseDown={(e) => handleResizeStart(e, 'supplier')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-10 transition-colors"/>
                    </th>
                    <th className="p-4 relative group select-none hover:bg-slate-200 transition-colors border-r border-slate-200" style={{ width: colWidths.reply }}>
                      採購回覆
                      <div onMouseDown={(e) => handleResizeStart(e, 'reply')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-10 transition-colors"/>
                    </th>
                    <th className="p-4 relative group select-none hover:bg-slate-200 transition-colors" style={{ width: colWidths.remark }}>
                      備註
                      <div onMouseDown={(e) => handleResizeStart(e, 'remark')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-10 transition-colors"/>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-base">
                  {realShortages.length === 0 ? (
                     <tr><td colSpan={5} className="p-10 text-center text-slate-400 text-xl font-bold">無欠料項目 (Great!)</td></tr>
                  ) : (
                    realShortages.map(row => (
                      <tr key={row.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4 align-top overflow-hidden border-r border-slate-100" style={{ width: colWidths.part }}>
                          <div className="flex items-baseline justify-between">
                             <span className="font-extrabold text-slate-900 font-mono text-xl tracking-tight text-blue-900 truncate" title={row.partNumber}>{row.partNumber}</span>
                          </div>
                          <div className="text-lg text-slate-700 mt-1 font-medium leading-relaxed truncate" title={row.partName}>{row.partName}</div>
                          <div className="text-base text-slate-400 mt-1 truncate font-mono" title={row.specification}>{row.specification}</div>
                        </td>
                        <td className="p-4 align-top text-center border-r border-slate-100" style={{ width: colWidths.qty }}>
                            <span className="font-mono font-bold text-xl text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block border border-red-200 shadow-sm">{row.shortageQty}</span>
                        </td>
                        <td className="p-4 align-top text-blue-800 font-bold text-lg truncate border-r border-slate-100" style={{ width: colWidths.supplier }} title={row.supplier}>{row.supplier}</td>
                        <td className="p-4 align-top border-r border-slate-100" style={{ width: colWidths.reply }}>
                          {isPurchaser && viewMode === 'active' ? (
                            <div className="scale-110 origin-top-left w-[90%]"><CompactDateInput value={row.purchaserReplyDate} onChange={val => updateRow(row.id, {purchaserReplyDate: val})} /></div>
                          ) : <span className={`text-lg ${row.purchaserReplyDate ? 'text-slate-900 font-bold' : 'text-slate-300'}`}>{row.purchaserReplyDate || '-'}</span>}
                        </td>
                        <td className="p-4 align-top" style={{ width: colWidths.remark }}>
                          {isPurchaser && viewMode === 'active' ? (
                            <textarea className="border border-slate-300 rounded-lg px-3 py-2 w-full bg-slate-50 text-base focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none h-24 shadow-inner" value={row.purchaserRemark} onChange={e => updateRow(row.id, {purchaserRemark: e.target.value})} placeholder="備註..." />
                          ) : <span className="text-base text-slate-600 block break-words leading-relaxed whitespace-pre-wrap">{row.purchaserRemark}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>

           {/* Modal Footer */}
           <div className="bg-white border-t border-slate-200 p-6 flex justify-end gap-6 shrink-0">
              {isScheduler && viewMode === 'active' && (
                <button onClick={() => toggleStageReady(repRow.workOrder, stage, isReady)} className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-xl font-bold transition-all shadow-md active:scale-95 ${isReady ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-white border-2 border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600'}`}>
                  {isReady ? <CheckSquare size={28}/> : <Square size={28}/>} {isReady ? '已確認齊料' : '確認齊料 (Ready)'}
                </button>
              )}
              <button onClick={() => setActiveModal(null)} className="px-10 py-4 bg-slate-800 text-white rounded-xl font-bold text-xl hover:bg-slate-900 transition-all shadow-lg active:scale-95">關閉視窗</button>
           </div>
        </div>
      </div>
    );
  };

  const renderStageCard = (modelName: string, stageName: string, modelRows: TrackingRow[]) => {
    const stageRows = modelRows.filter(r => r.stage === stageName);
    const repRow = stageRows[0];
    const realShortages = stageRows.filter(r => r.shortageQty > 0);
    const hasRealShortages = realShortages.length > 0;
    const status = getStageStatus(stageRows);

    if (!repRow) {
      return (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 flex items-center justify-center bg-slate-50 opacity-50 h-[240px]">
           <span className="text-lg text-slate-400 font-bold">{stageName} (未匯入)</span>
        </div>
      );
    }

    let borderClass = 'border-slate-200';
    let bgClass = 'bg-white';
    if (status === 'ok') { borderClass = 'border-green-300'; bgClass = 'bg-green-50/30'; } 
    else if (status === 'late') { borderClass = 'border-red-300'; bgClass = 'bg-red-50/40'; } 
    else { borderClass = 'border-yellow-300'; bgClass = 'bg-yellow-50/40'; }

    return (
      <div 
        className={`border-2 rounded-3xl overflow-hidden transition-all flex flex-col h-[240px] shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative ${borderClass} ${bgClass}`}
        onClick={() => hasRealShortages && setActiveModal({model: modelName, stage: stageName})}
      >
        <div className="p-8 flex flex-col h-full relative z-10">
          <div className="flex justify-between items-start mb-6">
             <div>
                <span className="font-extrabold text-3xl text-slate-800 tracking-tight block">{stageName}</span>
                <span className="text-xl text-blue-700 font-bold font-mono mt-1 block tracking-wide">{repRow.workOrder}</span>
             </div>
             <div>
                {status === 'ok' ? <span className="text-base font-bold bg-green-100 text-green-700 px-4 py-2 rounded-xl border border-green-200 shadow-sm">{hasRealShortages ? '已齊料' : '無欠料'}</span> : status === 'late' ? <span className="text-base font-bold bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-200 shadow-sm">延遲</span> : <span className="text-base font-bold bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl border border-yellow-200 shadow-sm">待確認</span>}
             </div>
          </div>

          <div className="flex items-center gap-4 bg-white/60 p-4 rounded-xl border border-slate-200/50 backdrop-blur-sm mt-auto group-hover:bg-white/90 transition-colors">
             <Factory size={28} className="text-blue-600" />
             <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">外包廠</span>
                <span className="text-lg font-bold text-blue-900">{repRow.vendor}</span>
             </div>
             {hasRealShortages && <div className="ml-auto bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm font-bold border border-red-200">缺 {realShortages.length} 項</div>}
          </div>
          
          {hasRealShortages && (
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
                <Maximize2 size={48} className="drop-shadow-md"/>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      <div className="flex flex-1 relative">
        <aside className={`${isMobileMenuOpen ? 'fixed inset-0 z-40 bg-white p-6' : 'hidden'} md:block md:sticky md:top-20 md:h-[calc(100vh-80px)] bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-24 px-4' : 'w-72 px-6'} py-8 overflow-y-auto`}>
           <div className="space-y-2">
              <NavItem id="tracking" label="生產排程追蹤" icon={Layers} />
              {canImport && <NavItem id="upload" label="匯入 ERP 資料" icon={UploadCloud} />}
              {canManageUsers && <NavItem id="users" label="人員權限管理" icon={Users} />}
           </div>
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex absolute bottom-8 left-0 right-0 justify-center text-slate-400 hover:text-blue-600 transition-colors">{isSidebarCollapsed ? <PanelLeftOpen size={28}/> : <PanelLeftClose size={28}/>}</button>
        </aside>
        <main className="flex-1 p-4 md:p-10 overflow-x-hidden w-full">
           <div className="max-w-[1800px] mx-auto">
             {view === 'tracking' && <TrackingView user={user} />}
             {view === 'upload' && canImport && <UploadView user={user} />}
             {view === 'users' && canManageUsers && <UserManagementView />}
           </div>
        </main>
      </div>
    </div>
  );
};

export default App;
