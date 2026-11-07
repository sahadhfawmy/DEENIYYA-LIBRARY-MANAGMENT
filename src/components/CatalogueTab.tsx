import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Copy,
  Plus,
  Edit,
  Trash2,
  Archive,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Printer,
  Eye,
} from 'lucide-react';
import { Book, BookCopy } from '../types';
import { mt, sanitizeInput } from '../lib/security';

interface CatalogueTabProps {
  books: Book[];
  copies: BookCopy[];
  isSuperAdmin: boolean;
  onEditBook?: (book: Book) => void;
  onDeleteBook?: (bookId: string) => void;
  onArchiveBook?: (bookId: string) => void;
  onNavigateAdd?: () => void;
  onExportPdf?: (filteredList: Book[], filterName: string) => void;
}

export const CatalogueTab: React.FC<CatalogueTabProps> = ({
  books,
  copies,
  isSuperAdmin,
  onEditBook,
  onDeleteBook,
  onArchiveBook,
  onNavigateAdd,
  onExportPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 40;

  // Book Detail Drawer Modal
  const [detailBook, setDetailBook] = useState<Book | null>(null);

  // Pre-index copies by book ID
  const copiesByBook = useMemo(() => {
    const map = new Map<string, BookCopy[]>();
    copies.forEach((c) => {
      const arr = map.get(c.b) || [];
      arr.push(c);
      map.set(c.b, arr);
    });
    return map;
  }, [copies]);

  // Unique Languages and Categories
  const languages = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.l).filter(Boolean))).sort() as string[];
  }, [books]);

  const categories = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.k).filter(Boolean))).slice(0, 30).sort() as string[];
  }, [books]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim();
    return books.filter((b) => {
      if (b.arch) return false;
      if (selectedLang && b.l !== selectedLang) return false;
      if (selectedCategory && b.k !== selectedCategory) return false;

      if (onlyAvailable) {
        const bookCopies = copiesByBook.get(b.id) || [];
        const hasAvail = bookCopies.some((c) => c.st === 'available');
        if (!hasAvail) return false;
      }

      if (q) {
        const haystack = [b.t, b.a, b.c, b.k, b.p, b.y, b.sh].filter(Boolean).join(' ');
        if (!mt(haystack, q)) return false;
      }

      return true;
    });
  }, [books, searchQuery, selectedLang, selectedCategory, onlyAvailable, copiesByBook]);

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / PAGE_SIZE) || 1;
  const currentBooks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, page]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search title, author, classification, or category (Arabic & English) · بحث في الفهرس"
              value={searchQuery}
              onChange={handleSearchChange}
              dir="auto"
              className="w-full text-xs py-2.5 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setPage(1); }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onExportPdf && (
              <button
                onClick={() => {
                  const filterDesc = searchQuery
                    ? `Search: "${searchQuery}"`
                    : selectedCategory
                    ? `Category: ${selectedCategory}`
                    : selectedLang
                    ? `Language: ${selectedLang}`
                    : 'Full Collection';
                  onExportPdf(filteredBooks, filterDesc);
                }}
                className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-semibold text-xs shadow-sm transition"
                title="Export printable PDF document of current catalog selection"
              >
                <Printer className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span>Export PDF · طباعة الفهرس</span>
              </button>
            )}

            {/* Super Admin Add Book shortcut */}
            {isSuperAdmin && onNavigateAdd && (
              <button
                onClick={onNavigateAdd}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Book · إضافة كتاب</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center space-x-1 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedLang}
            onChange={(e) => { setSelectedLang(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="">All Languages · كل اللغات</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none max-w-xs truncate"
          >
            <option value="">All Categories · الأقسام</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center space-x-1.5 cursor-pointer ml-auto text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => { setOnlyAvailable(e.target.checked); setPage(1); }}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Available in stacks only</span>
          </label>
        </div>
      </div>

      {/* Catalog Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Showing <b>{filteredBooks.length.toLocaleString()}</b> titles · صفحة {page} من {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Title · العنوان</th>
                <th className="py-3 px-4">Author · المؤلف</th>
                <th className="py-3 px-3">Call No. / Class</th>
                <th className="py-3 px-3">Language</th>
                <th className="py-3 px-3">Copies</th>
                <th className="py-3 px-3">Shelf</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentBooks.map((b) => {
                const bookCopies = copiesByBook.get(b.id) || [];
                const availCount = bookCopies.filter((c) => c.st === 'available').length;
                const totalCount = bookCopies.length;

                return (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                      <div
                        onClick={() => setDetailBook(b)}
                        className="cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 font-arabic text-sm line-clamp-2"
                        dir="auto"
                      >
                        {b.t}
                      </div>
                      {b.k && (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                          {b.k}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-arabic text-xs max-w-xs truncate" dir="auto">
                      {b.a}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                      {b.c || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {b.l || 'Arabic'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          availCount > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {availCount} / {totalCount} Avail
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {b.sh || '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setDetailBook(b)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        title="Preview Book Record · معاينة بيانات الكتاب"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDetailBook(b)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium"
                      >
                        Copies ({totalCount})
                      </button>

                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => onEditBook?.(b)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                            title="Edit Book Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onArchiveBook?.(b.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-amber-700 hover:bg-slate-100"
                            title="Archive Book"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteBook?.(b.id)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900"
                            title="Delete Book Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Detail Drawer Modal */}
      {detailBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                  Class: {detailBook.c || 'General'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-arabic" dir="auto">
                  {detailBook.t}
                </h3>
                <p className="text-xs text-slate-500 font-arabic" dir="auto">
                  المؤلف: {detailBook.a}
                </p>
              </div>
              <button
                onClick={() => setDetailBook(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Bibliographic Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Publisher · الناشر</span>
                  <span className="font-arabic font-medium">{detailBook.p || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Year · سنة الطبع</span>
                  <span className="font-mono">{detailBook.y || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Edition · الطبعة</span>
                  <span>{detailBook.e || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Language · اللغة</span>
                  <span>{detailBook.l || 'Arabic'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Shelf · الرف</span>
                  <span className="font-mono">{detailBook.sh || 'Main Stacks'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Category · التصنيف</span>
                  <span>{detailBook.k || 'Islamic Sciences'}</span>
                </div>
              </div>

              {/* Physical Copies Accession List */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                  <span>Physical Copies in Library ({copiesByBook.get(detailBook.id)?.length || 0})</span>
                  <span className="text-[10px] text-slate-400">Verified Accession Registry</span>
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {(copiesByBook.get(detailBook.id) || []).map((cp) => (
                    <div
                      key={cp.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          #{cp.r}
                        </span>
                        {cp.v && (
                          <span className="text-slate-500 font-arabic">({cp.v})</span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          cp.st === 'available'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {cp.st.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailBook(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
              >
                Close · إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
