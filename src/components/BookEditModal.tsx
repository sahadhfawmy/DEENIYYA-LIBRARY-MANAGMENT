import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Save,
  X,
  Eye,
  CheckCircle2,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
  Hash,
} from 'lucide-react';
import { Book, BookCopy } from '../types';
import { sanitizeInput } from '../lib/security';

interface BookEditModalProps {
  isOpen: boolean;
  book: Book | null;
  copies: BookCopy[];
  onClose: () => void;
  onSave: (updatedBook: Book, updatedCopies: BookCopy[]) => Promise<void>;
}

export const BookEditModal: React.FC<BookEditModalProps> = ({
  isOpen,
  book,
  copies,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Book>>({});
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (book) {
      setFormData({ ...book });
      // Filter all copies belonging to this book
      const existingCopies = copies.filter((c) => c.b === book.id);
      setBookCopies(existingCopies);
      setShowPreview(false);
      setErrorMsg(null);
    }
  }, [book, copies, isOpen]);

  if (!isOpen || !book) return null;

  const handleAddCopy = () => {
    const nextReg =
      Math.max(0, ...copies.map((c) => parseInt(c.r, 10) || 0)) +
      bookCopies.length +
      1;
    const newCopy: BookCopy = {
      id: `c-${book.id}-${Date.now().toString(36)}`,
      b: book.id,
      r: String(nextReg),
      v: '',
      st: 'available',
    };
    setBookCopies([...bookCopies, newCopy]);
  };

  const handleUpdateCopyStatus = (copyId: string, status: BookCopy['st']) => {
    setBookCopies(
      bookCopies.map((c) => (c.id === copyId ? { ...c, st: status } : c))
    );
  };

  const handleUpdateCopyVolume = (copyId: string, volume: string) => {
    setBookCopies(
      bookCopies.map((c) => (c.id === copyId ? { ...c, v: volume } : c))
    );
  };

  const handleRemoveCopy = (copyId: string) => {
    if (bookCopies.length <= 1) {
      alert('A book record must retain at least one accession copy.');
      return;
    }
    setBookCopies(bookCopies.filter((c) => c.id !== copyId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.t?.trim() || !formData.a?.trim()) {
      setErrorMsg('Book Title and Author are mandatory.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const updatedBook: Book = {
        ...book,
        t: sanitizeInput(formData.t || ''),
        a: sanitizeInput(formData.a || ''),
        c: formData.c ? sanitizeInput(formData.c) : undefined,
        l: formData.l ? sanitizeInput(formData.l) : undefined,
        e: formData.e ? sanitizeInput(formData.e) : undefined,
        p: formData.p ? sanitizeInput(formData.p) : undefined,
        y: formData.y ? sanitizeInput(formData.y) : undefined,
        k: formData.k ? sanitizeInput(formData.k) : undefined,
        sh: formData.sh ? sanitizeInput(formData.sh) : undefined,
      };

      await onSave(updatedBook, bookCopies);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update book.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white flex items-center justify-between border-b border-emerald-800/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-800/60 rounded-xl border border-emerald-600/30 text-emerald-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Edit Book Information · تعديل بيانات الكتاب
              </h2>
              <p className="text-xs text-emerald-300 font-mono">ID: {book.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                showPreview
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-slate-800/80 text-emerald-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Show Editor' : 'Live Preview'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {showPreview ? (
            /* LIVE PREVIEW CARD */
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800 dark:to-slate-850 border border-emerald-500/30 shadow-md space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase font-semibold">
                    Dewey: {formData.c || 'General'}
                  </span>
                  <h3 className="text-xl font-bold font-arabic text-slate-900 dark:text-white mt-2" dir="auto">
                    {formData.t || 'Untitled Book'}
                  </h3>
                  <p className="text-sm font-arabic text-emerald-700 dark:text-emerald-400 font-medium" dir="auto">
                    المؤلف: {formData.a || 'Author Unknown'}
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-slate-400">
                  <div>Shelf: <b className="text-slate-800 dark:text-slate-200">{formData.sh || 'Main Stacks'}</b></div>
                  <div>Lang: <b className="text-slate-800 dark:text-slate-200">{formData.l || 'Arabic'}</b></div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Publisher</span>
                  <span className="font-arabic font-medium">{formData.p || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Year</span>
                  <span className="font-mono">{formData.y || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Edition</span>
                  <span>{formData.e || '1'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Category</span>
                  <span className="truncate block">{formData.k || 'General'}</span>
                </div>
              </div>

              {/* Physical Copies Overview */}
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Physical Stacks Inventory ({bookCopies.length} Copies)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {bookCopies.filter((c) => c.st === 'available').length} Available
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bookCopies.map((cp) => (
                    <div
                      key={cp.id}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs flex items-center space-x-1.5"
                    >
                      <span className="font-mono font-bold text-emerald-700">#{cp.r}</span>
                      {cp.v && <span className="text-slate-400 font-arabic">({cp.v})</span>}
                      <span
                        className={`text-[9px] px-1 rounded uppercase font-semibold ${
                          cp.st === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cp.st}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* EDITOR FORM */
            <form id="edit-book-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Book Title * · عنوان الكتاب
                  </label>
                  <input
                    type="text"
                    required
                    dir="auto"
                    value={formData.t || ''}
                    onChange={(e) => setFormData({ ...formData, t: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-arabic text-sm text-slate-900 dark:text-white"
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
                    value={formData.a || ''}
                    onChange={(e) => setFormData({ ...formData, a: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-arabic text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Classification / Dewey · رقم التصنيف
                  </label>
                  <input
                    type="text"
                    value={formData.c || ''}
                    onChange={(e) => setFormData({ ...formData, c: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category / Genre · القسم
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={formData.k || ''}
                    onChange={(e) => setFormData({ ...formData, k: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Language · اللغة
                  </label>
                  <input
                    type="text"
                    value={formData.l || ''}
                    onChange={(e) => setFormData({ ...formData, l: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Publisher · دار النشر
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={formData.p || ''}
                    onChange={(e) => setFormData({ ...formData, p: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Publication Year · سنة الطبع
                  </label>
                  <input
                    type="text"
                    value={formData.y || ''}
                    onChange={(e) => setFormData({ ...formData, y: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shelf Location · الرف
                  </label>
                  <input
                    type="text"
                    value={formData.sh || ''}
                    onChange={(e) => setFormData({ ...formData, sh: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Edition · الطبعة
                  </label>
                  <input
                    type="text"
                    value={formData.e || ''}
                    onChange={(e) => setFormData({ ...formData, e: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Physical Copies Management Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Accession Copies in Circulation ({bookCopies.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCopy}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Copy</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {bookCopies.map((cp, idx) => (
                    <div
                      key={cp.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-700">
                          #{cp.r}
                        </span>
                        <input
                          type="text"
                          placeholder="Part/Volume (e.g. ج1)"
                          value={cp.v || ''}
                          onChange={(e) => handleUpdateCopyVolume(cp.id, e.target.value)}
                          className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 w-28 font-arabic"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          value={cp.st}
                          onChange={(e) =>
                            handleUpdateCopyStatus(cp.id, e.target.value as BookCopy['st'])
                          }
                          className="py-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        >
                          <option value="available">Available</option>
                          <option value="issued">Issued</option>
                          <option value="lost">Lost</option>
                          <option value="damaged">Damaged</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveCopy(cp.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                          title="Remove Copy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel · إلغاء
          </button>

          <button
            type="submit"
            form="edit-book-form"
            disabled={saving}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes…' : 'Save & Update Book'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
