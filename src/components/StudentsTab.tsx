import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Archive,
  Download,
  Printer,
  ShieldAlert,
  Camera,
  X,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Student, LibrarySettings } from '../types';
import { mt, sanitizeInput } from '../lib/security';
import { downloadStudentIdCardImage, downloadStudentIdCardPdf, printSingleStudentIdCard } from '../lib/idCardRenderer';

interface StudentsTabProps {
  students: Student[];
  settings: LibrarySettings;
  isSuperAdmin: boolean;
  onSaveStudent: (student: Student, isNew: boolean) => Promise<void>;
  onDeleteStudent: (id: string) => void | Promise<void>;
  onArchiveStudent: (id: string) => void | Promise<void>;
  onNavigateCards?: () => void;
  onOpenLogin: () => void;
  onExportPdf?: (filteredList: Student[], filterName: string) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  settings,
  isSuperAdmin,
  onSaveStudent,
  onDeleteStudent,
  onArchiveStudent,
  onNavigateCards,
  onOpenLogin,
  onExportPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Profile Viewer Modal
  const [viewingProfile, setViewingProfile] = useState<Student | null>(null);

  // If visitor attempts to view: Strict Privacy Gate
  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg mt-8">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto text-red-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Restricted Student Information
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Student records contain Personally Identifiable Information (PII) including guardian contacts, residential addresses, and photos. Under College Privacy Regulations, access is strictly restricted to the Super Admin.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-md"
        >
          Authenticate as Super Admin
        </button>
      </div>
    );
  }

  // Next Auto Student ID
  const nextStudentId = useMemo(() => {
    let max = 0;
    students.forEach((s) => {
      const match = s.id.match(/^STU-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    return `STU-${String(max + 1).padStart(4, '0')}`;
  }, [students]);

  // Unique Classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.cl).filter(Boolean))).sort() as string[];
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim();
    return students.filter((s) => {
      if (statusFilter === 'active' && s.arch) return false;
      if (statusFilter === 'archived' && !s.arch) return false;
      if (selectedClass && s.cl !== selectedClass) return false;

      if (q) {
        const text = [s.id, s.n, s.cl, s.ph, s.g, s.tn, s.rg].filter(Boolean).join(' ');
        if (!mt(text, q)) return false;
      }
      return true;
    });
  }, [students, searchQuery, selectedClass, statusFilter]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      id: nextStudentId,
      n: '',
      cl: '',
      ph: '',
      g: '',
      dob: '',
      adm: new Date().toISOString().slice(0, 10),
      tn: '',
      rg: '',
      rx: '',
      ad: '',
      rm: '',
    });
    setPhotoPreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setPhotoPreview(student.img || '');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const m = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 160, 160);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotoPreview(dataUrl);
          setFormData((prev) => ({ ...prev, img: dataUrl }));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.n) {
      alert('Student ID and Full Name are required.');
      return;
    }

    const studentToSave: Student = {
      id: sanitizeInput(formData.id),
      n: sanitizeInput(formData.n),
      cl: formData.cl ? sanitizeInput(formData.cl) : undefined,
      ph: formData.ph ? sanitizeInput(formData.ph) : undefined,
      g: formData.g ? sanitizeInput(formData.g) : undefined,
      dob: formData.dob || undefined,
      adm: formData.adm || undefined,
      tn: formData.tn ? sanitizeInput(formData.tn) : undefined,
      rg: formData.rg ? sanitizeInput(formData.rg) : undefined,
      rx: formData.rx || undefined,
      ad: formData.ad ? sanitizeInput(formData.ad) : undefined,
      rm: formData.rm ? sanitizeInput(formData.rm) : undefined,
      img: photoPreview || undefined,
      reg: editingStudent?.reg || new Date().toISOString().slice(0, 10),
      arch: editingStudent?.arch || false,
      off: editingStudent?.off || false,
    };

    await onSaveStudent(studentToSave, !editingStudent);
    setIsModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Class', 'Contact', 'Guardian', 'Town', 'Admission', 'Expiry'];
    const rows = filteredStudents.map((s) => [
      s.id,
      `"${(s.n || '').replace(/"/g, '""')}"`,
      `"${(s.cl || '').replace(/"/g, '""')}"`,
      s.ph || '',
      `"${(s.g || '').replace(/"/g, '""')}"`,
      `"${(s.tn || '').replace(/"/g, '""')}"`,
      s.adm || '',
      s.rx || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Search & Actions Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search student name, ID, class, town, or guardian · بحث الطلاب"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              dir="auto"
              className="w-full text-xs py-2.5 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            {onExportPdf && (
              <button
                onClick={() => {
                  const filterDesc = selectedClass
                    ? `Class: ${selectedClass}`
                    : statusFilter !== 'all'
                    ? `Status: ${statusFilter}`
                    : 'All Active Students';
                  onExportPdf(filteredStudents, filterDesc);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 text-xs font-semibold"
                title="Export printable official Student Directory PDF document"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                <span>Export PDF · طباعة السجل</span>
              </button>
            )}
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student · إضافة طالب</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="">All Classes · كل الصفوف</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="active">Active Members Only</option>
            <option value="archived">Archived Students</option>
            <option value="all">All Records</option>
          </select>
        </div>
      </div>

      {/* Student List Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Showing <b>{filteredStudents.length}</b> student records · سجلات الطلاب
        </div>
        {onNavigateCards && (
          <button
            onClick={onNavigateCards}
            className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
          >
            Go to Student ID Cards Generator →
          </button>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3 w-12">Photo</th>
                <th className="py-3 px-3">Student ID</th>
                <th className="py-3 px-4">Full Name · الاسم</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Town</th>
                <th className="py-3 px-3">Admission</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition"
                  >
                    <td className="py-2.5 px-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border border-emerald-300 dark:border-emerald-800">
                        {s.img ? (
                          <img src={s.img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                            {(s.n || '?').charAt(0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      {s.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 font-arabic text-sm" dir="auto">
                      {s.n}
                      {s.rg && <div className="text-[10px] font-mono text-slate-400">Reg: {s.rg}</div>}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {s.cl || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-arabic" dir="auto">
                      {s.tn || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {s.adm || s.reg || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.arch
                            ? 'bg-slate-100 text-slate-600'
                            : s.off
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {s.arch ? 'Archived' : s.off ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => downloadStudentIdCardImage(s, settings, 'png')}
                        className="px-2 py-1 rounded-lg border border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[11px] font-semibold"
                        title="Download ID Card (High-Res PNG)"
                      >
                        Download ID
                      </button>
                      <button
                        onClick={() => printSingleStudentIdCard(s, settings)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 dark:text-slate-300"
                        title="Print Student ID Card"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewingProfile(s)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[11px]"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-emerald-700 hover:bg-slate-100"
                        title="Edit Student"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onArchiveStudent(s.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-amber-700 hover:bg-slate-100"
                        title={s.arch ? 'Restore' : 'Archive'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(s.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No student records found. Add students to issue library cards.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingStudent ? 'Edit Student Profile' : 'Add New Student · إضافة طالب'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Photo Upload Section */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Student Photo · الصورة الشخصية
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400">Photo is processed and stored securely for ID cards.</p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student ID * (Auto-Assigned)
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={Boolean(editingStudent)}
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name * · الاسم الكامل
                  </label>
                  <input
                    type="text"
                    required
                    dir="auto"
                    value={formData.n || ''}
                    onChange={(e) => setFormData({ ...formData, n: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class / Year · الصف
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Year 1, Alim Course"
                    value={formData.cl || ''}
                    onChange={(e) => setFormData({ ...formData, cl: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone · الهاتف
                  </label>
                  <input
                    type="text"
                    value={formData.ph || ''}
                    onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Guardian Name · ولي الأمر
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={formData.g || ''}
                    onChange={(e) => setFormData({ ...formData, g: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Town / Location · البلدة
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={formData.tn || ''}
                    onChange={(e) => setFormData({ ...formData, tn: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admission Date · تاريخ القبول
                  </label>
                  <input
                    type="date"
                    value={formData.adm || ''}
                    onChange={(e) => setFormData({ ...formData, adm: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registration Expiry · انتهاء التسجيل
                  </label>
                  <input
                    type="date"
                    value={formData.rx || ''}
                    onChange={(e) => setFormData({ ...formData, rx: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Residential Address · العنوان
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={formData.ad || ''}
                    onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  {editingStudent ? 'Update Student' : 'Save Student Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 text-white text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 mx-auto overflow-hidden flex items-center justify-center shadow-lg">
                {viewingProfile.img ? (
                  <img src={viewingProfile.img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold">{(viewingProfile.n || '?').charAt(0)}</span>
                )}
              </div>
              <h3 className="text-lg font-bold mt-2 font-arabic" dir="auto">{viewingProfile.n}</h3>
              <p className="text-xs text-emerald-200 font-mono">{viewingProfile.id}</p>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Class</span>
                  <span className="font-semibold">{viewingProfile.cl || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Town</span>
                  <span className="font-semibold">{viewingProfile.tn || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="font-semibold font-mono">{viewingProfile.ph || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Guardian</span>
                  <span className="font-semibold">{viewingProfile.g || '—'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadStudentIdCardImage(viewingProfile, settings, 'png')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (PNG)</span>
                  </button>
                  <button
                    onClick={() => downloadStudentIdCardPdf(viewingProfile, settings, '3K')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-semibold text-xs flex items-center space-x-1 transition"
                  >
                    <span>PDF (16:9)</span>
                  </button>
                  <button
                    onClick={() => printSingleStudentIdCard(viewingProfile, settings)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-1 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>

                <button
                  onClick={() => setViewingProfile(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
