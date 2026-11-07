import React, { useState } from 'react';
import { BookOpen, Plus, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Book, BookCopy } from '../types';
import { sanitizeInput } from '../lib/security';

interface AddBookTabProps {
  existingBooks: Book[];
  copiesCount: number;
  isSuperAdmin: boolean;
  onSaveBook: (book: Book, copies: BookCopy[]) => Promise<void>;
  onNavigateCatalog: () => void;
  onOpenLogin: () => void;
}

export const AddBookTab: React.FC<AddBookTabProps> = ({
  existingBooks,
  copiesCount,
  isSuperAdmin,
  onSaveBook,
  onNavigateCatalog,
  onOpenLogin,
}) => {
  const [formData, setFormData] = useState({
    t: '',
    a: '',
    c: '',
    l: 'العربية',
    e: '',
    p: '',
    y: '',
    k: 'Islamic Studies · علوم إسلامية',
    sh: '',
    copies: 1,
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-lg mt-8">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold">Catalog Write Access Restricted</h3>
        <p className="text-xs text-slate-500">Adding new catalog titles requires Super Admin privileges.</p>
        <button onClick={onOpenLogin} className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-xs">
          Admin Login
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.t.trim() || !formData.a.trim()) {
      alert('Book title and author are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const bookId = 'b-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const newBook: Book = {
        id: bookId,
        t: sanitizeInput(formData.t),
        a: sanitizeInput(formData.a),
        c: formData.c ? sanitizeInput(formData.c) : undefined,
        l: formData.l ? sanitizeInput(formData.l) : undefined,
        e: formData.e ? sanitizeInput(formData.e) : undefined,
        p: formData.p ? sanitizeInput(formData.p) : undefined,
        y: formData.y ? sanitizeInput(formData.y) : undefined,
        k: formData.k ? sanitizeInput(formData.k) : undefined,
        sh: formData.sh ? sanitizeInput(formData.sh) : undefined,
      };

      const copyCount = Math.min(50, Math.max(1, formData.copies || 1));
      const startingReg = copiesCount + 1;
      const newCopies: BookCopy[] = [];

      for (let i = 0; i < copyCount; i++) {
        newCopies.push({
          id: `c-${bookId}-${i + 1}`,
          b: bookId,
          r: String(startingReg + i),
          st: 'available',
        });
      }

      await onSaveBook(newBook, newCopies);
      setSuccessMsg(`Successfully added "${newBook.t}" with ${copyCount} physical copy/copies!`);
      setFormData({
        t: '',
        a: '',
        c: '',
        l: 'العربية',
        e: '',
        p: '',
        y: '',
        k: 'Islamic Studies · علوم إسلامية',
        sh: '',
        copies: 1,
      });
      setTimeout(() => setSuccessMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Add New Book · إضافة كتاب جديد
            </h2>
            <p className="text-xs text-slate-500">Record a new title into the Deeniya Arabic College Library register.</p>
          </div>
        </div>
        <button
          onClick={onNavigateCatalog}
          className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
        >
          View Catalog →
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Book Title * · عنوان الكتاب
          </label>
          <input
            type="text"
            required
            dir="auto"
            placeholder="e.g. فتح الباري شرح صحيح البخاري"
            value={formData.t}
            onChange={(e) => setFormData({ ...formData, t: e.target.value })}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-arabic text-sm"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Author * · المؤلف
          </label>
          <input
            type="text"
            required
            dir="auto"
            placeholder="e.g. ابن حجر العسقلاني"
            value={formData.a}
            onChange={(e) => setFormData({ ...formData, a: e.target.value })}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-arabic"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Classification / Dewey · رقم التصنيف
            </label>
            <input
              type="text"
              placeholder="e.g. 210.4, 250.323"
              value={formData.c}
              onChange={(e) => setFormData({ ...formData, c: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Language · اللغة
            </label>
            <input
              type="text"
              value={formData.l}
              onChange={(e) => setFormData({ ...formData, l: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Publisher · دار النشر
            </label>
            <input
              type="text"
              dir="auto"
              value={formData.p}
              onChange={(e) => setFormData({ ...formData, p: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-arabic"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Publication Year (CE / AH) · سنة الطبع
            </label>
            <input
              type="text"
              placeholder="e.g. 2018م / 1439هـ"
              value={formData.y}
              onChange={(e) => setFormData({ ...formData, y: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Shelf Location · الرف
            </label>
            <input
              type="text"
              placeholder="e.g. A-12, Fiqh Section"
              value={formData.sh}
              onChange={(e) => setFormData({ ...formData, sh: e.target.value })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Number of Copies · عدد النسخ
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={formData.copies}
              onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) || 1 })}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition"
        >
          {loading ? 'Saving to Database…' : 'Save Book to Catalog'}
        </button>
      </form>
    </div>
  );
};
