import React, { useState, useMemo, useDeferredValue } from 'react';
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
  Printer,
  Eye,
  Grid,
  List,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Book, BookCopy } from '../types';
import { nz } from '../lib/security';

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
  const deferredQuery = useDeferredValue(searchQuery);

  const [selectedLang, setSelectedLang] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(36);
  const [viewMode, setViewMode] = useState<'3d-cards' | 'table'>('table');

  // Book Detail Drawer Modal
  const [detailBook, setDetailBook] = useState<Book | null>(null);

  // Pre-index copies by book ID for O(1) instantaneous lookup
  const copiesByBook = useMemo(() => {
    const map = new Map<string, BookCopy[]>();
    copies.forEach((c) => {
      const arr = map.get(c.b) || [];
      arr.push(c);
      map.set(c.b, arr);
    });
    return map;
  }, [copies]);

  // Pre-index normalized search haystacks once per dataset change for ultra-fast browsing (60-120 FPS)
  const indexedBooks = useMemo(() => {
    return books.map((b) => ({
      book: b,
      haystack: nz(`${b.t} ${b.a} ${b.c || ''} ${b.k || ''} ${b.p || ''} ${b.y || ''} ${b.sh || ''}`),
    }));
  }, [books]);

  // Unique Languages and Categories
  const languages = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.l).filter(Boolean))).sort() as string[];
  }, [books]);

  const categories = useMemo(() => {
    return Array.from(new Set(books.map((b) => b.k).filter(Boolean))).slice(0, 40).sort() as string[];
  }, [books]);

  // High-performance filtered books with deferred query
  const filteredBooks = useMemo(() => {
    const qNorm = nz(deferredQuery);
    const words = qNorm ? qNorm.split(' ').filter(Boolean) : [];

    return indexedBooks
      .filter(({ book: b, haystack }) => {
        if (b.arch) return false;
        if (selectedLang && b.l !== selectedLang) return false;
        if (selectedCategory && b.k !== selectedCategory) return false;

        if (onlyAvailable) {
          const bookCopies = copiesByBook.get(b.id) || [];
          const hasAvail = bookCopies.some((c) => c.st === 'available');
          if (!hasAvail) return false;
        }

        if (words.length > 0) {
          return words.every((word) => haystack.includes(word));
        }

        return true;
      })
      .map(({ book }) => book);
  }, [indexedBooks, deferredQuery, selectedLang, selectedCategory, onlyAvailable, copiesByBook]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const currentBooks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, page, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Header with Islamic Luxury Trim */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-amber-500/30 dark:border-amber-500/20 shadow-md islamic-gold-glow space-y-4">
        {/* Islamic Banner Watermark */}
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-arabic text-amber-700 dark:text-amber-400 font-bold text-sm tracking-wide">
              فهرس المخطوطات والكتب المطبوعة (5,869 مجلداً)
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
            10,492 Accession Copies Active
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main search bar with instant debounced execution */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-amber-600 dark:text-amber-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search 5,869 titles by title, author, class, or category (Arabic/English) · بحث سريع في الفهرس"
              value={searchQuery}
              onChange={handleSearchChange}
              dir="auto"
              className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-16 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500/60 outline-none transition font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setPage(1); }}
                className="absolute right-3.5 top-2.5 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-800 rounded-lg transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Toggle (3D Cards vs High-Speed Table) */}
            <div className="flex items-center p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="High-Speed Table View (Optimized 60 FPS scrolling)"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d-cards')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  viewMode === '3d-cards'
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="3D Manuscript Cards View"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">3D Cards</span>
              </button>
            </div>

            {onExportPdf && (
              <button
                onClick={() => {
                  const filterDesc = searchQuery
                    ? `Search: "${searchQuery}"`
                    : selectedCategory
                    ? `Category: ${selectedCategory}`
                    : selectedLang
                    ? `Language: ${selectedLang}`
                    : 'Full Catalog Collection';
                  onExportPdf(filteredBooks, filterDesc);
                }}
                className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl border border-amber-600/30 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-semibold text-xs shadow-xs transition"
                title="Export printable PDF document of current catalog selection"
              >
                <Printer className="w-4 h-4 text-amber-600" />
                <span className="hidden md:inline">Export PDF</span>
              </button>
            )}

            {isSuperAdmin && onNavigateAdd && (
              <button
                onClick={onNavigateAdd}
                className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Book</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
          <div className="flex items-center space-x-1 text-slate-500">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold">Filters:</span>
          </div>

          <select
            value={selectedLang}
            onChange={(e) => { setSelectedLang(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none text-xs"
          >
            <option value="">All Languages · كل اللغات</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none text-xs max-w-xs truncate"
          >
            <option value="">All Categories · الأقسام والتصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center space-x-1.5 cursor-pointer ml-auto text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => { setOnlyAvailable(e.target.checked); setPage(1); }}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-xs font-semibold">Available on shelves only</span>
          </label>
        </div>
      </div>

      {/* Catalog Results Header with Page Controller */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Showing <b>{filteredBooks.length.toLocaleString()}</b> titles · صفحة <b>{page}</b> من <b>{totalPages}</b>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono outline-none"
            title="Rows per page"
          >
            <option value={24}>24 per page</option>
            <option value={36}>36 per page</option>
            <option value={60}>60 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: HIGH-SPEED LUXURY TABLE (GPU-accelerated, steady 60-120 FPS scrolling) */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto fast-scroll-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-slate-100 via-amber-50/30 to-slate-100 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Title & Classification · العنوان</th>
                  <th className="py-3.5 px-4">Author · المؤلف</th>
                  <th className="py-3.5 px-3">Call No.</th>
                  <th className="py-3.5 px-3">Language</th>
                  <th className="py-3.5 px-3">Copies Available</th>
                  <th className="py-3.5 px-3">Shelf</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {currentBooks.map((b) => {
                  const bookCopies = copiesByBook.get(b.id) || [];
                  const availCount = bookCopies.filter((c) => c.st === 'available').length;
                  const totalCount = bookCopies.length;

                  return (
                    <tr
                      key={b.id}
                      className="fast-table-row hover:bg-amber-50/40 dark:hover:bg-emerald-950/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                        <div
                          onClick={() => setDetailBook(b)}
                          className="cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 font-arabic text-sm line-clamp-2 font-bold"
                          dir="auto"
                        >
                          {b.t}
                        </div>
                        {b.k && (
                          <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {b.k}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-arabic text-xs max-w-xs truncate" dir="auto">
                        {b.a}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        {b.c || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {b.l || 'Arabic'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            availCount > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/30'
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
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                          title="Preview Book Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDetailBook(b)}
                          className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition"
                        >
                          Copies ({totalCount})
                        </button>

                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => onEditBook?.(b)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition"
                              title="Edit Book Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onArchiveBook?.(b.id)}
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-amber-700 hover:bg-slate-100 transition"
                              title="Archive Book"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteBook?.(b.id)}
                              className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 transition"
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
      )}

      {/* VIEW MODE 2: 3D MANUSCRIPT CARDS GRID (Islamic Luxury 3D Cards) */}
      {viewMode === '3d-cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBooks.map((b) => {
            const bookCopies = copiesByBook.get(b.id) || [];
            const availCount = bookCopies.filter((c) => c.st === 'available').length;
            const totalCount = bookCopies.length;

            return (
              <div
                key={b.id}
                onClick={() => setDetailBook(b)}
                className="fast-card-item group relative p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-xl dark:hover:shadow-emerald-950/40 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* 3D Islamic Corner Trim Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/10 dark:from-emerald-500/10 to-transparent pointer-events-none rounded-bl-3xl" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Call: {b.c || 'General'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        availCount > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {availCount}/{totalCount} Available
                    </span>
                  </div>

                  <h3 className="font-arabic font-bold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition" dir="auto">
                    {b.t}
                  </h3>

                  <p className="font-arabic text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1" dir="auto">
                    المؤلف: {b.a}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Shelf: <b>{b.sh || 'Main Stacks'}</b></span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                    View Details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Book Detail Drawer Modal */}
      {detailBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-emerald-950/30 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Class: {detailBook.c || 'General'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 font-arabic" dir="auto">
                  {detailBook.t}
                </h3>
                <p className="text-xs text-slate-400 font-arabic mt-0.5" dir="auto">
                  المؤلف: {detailBook.a}
                </p>
              </div>
              <button
                onClick={() => setDetailBook(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-medium">Category · القسم</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailBook.k || 'General'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-medium">Language · اللغة</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailBook.l || 'Arabic'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-medium">Shelf · رقم الرف</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">{detailBook.sh || '—'}</div>
                </div>
              </div>

              {/* Accession Copies Register */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-1.5">
                  <Copy className="w-4 h-4 text-emerald-600" />
                  <span>Accession Copies Register · نسخ الكتاب المسجلة</span>
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {(copiesByBook.get(detailBook.id) || []).map((cp) => (
                    <div key={cp.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          Acc No: #{cp.r}
                        </span>
                        {cp.v && <span className="ml-2 text-slate-500">Vol {cp.v}</span>}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => setDetailBook(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
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
