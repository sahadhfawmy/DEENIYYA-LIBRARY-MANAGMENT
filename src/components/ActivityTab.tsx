import React, { useState } from 'react';
import { History, Search, Filter, ShieldCheck, Clock, User } from 'lucide-react';
import { AuditLog } from '../types';

interface ActivityTabProps {
  logs: AuditLog[];
  isSuperAdmin: boolean;
  onOpenLogin: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ logs, isSuperAdmin, onOpenLogin }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-lg mt-8">
        <ShieldCheck className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold">Activity Logs Restricted</h3>
        <p className="text-xs text-slate-500">
          The administrative audit trail is confidential and available only to the Super Admin.
        </p>
        <button onClick={onOpenLogin} className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-xs">
          Admin Login
        </button>
      </div>
    );
  }

  const types = Array.from(new Set(logs.map((l) => l.ty).filter(Boolean)));

  const filteredLogs = logs.filter((l) => {
    if (filterType && l.ty !== filterType) return false;
    if (search) {
      const text = `${l.a} ${l.by} ${l.ty || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-emerald-700" />
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            Institutional Audit & Activity Trail ({logs.length})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search activity description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">All Categories</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Event Description · الإجراء</th>
                <th className="py-3 px-3">Operator · المنفذ</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {log.a}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {log.by}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                        {log.ty || 'general'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(log.at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.ok === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {log.ok === 0 ? 'FAILED' : 'RECORDED'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No activity records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
