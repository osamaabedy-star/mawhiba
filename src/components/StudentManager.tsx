import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Student, 
  Test, 
  GradeLevel, 
  GRADE_LABELS 
} from '../types';
import { 
  UserPlus, 
  Search, 
  PlayCircle, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Upload, 
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  RotateCcw
} from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  tests: Test[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onLaunchExamForStudent: (student: Student, testId: string, modelId?: string) => void;
  onResetStudentTest?: (studentId: string) => void;
}

/**
 * إدارة الطلاب - منصة الموهوبين
 * يدعم إضافة الطلاب يدوياً أو عبر استيراد ملف Excel
 */
export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  tests,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onLaunchExamForStudent,
  onResetStudentTest,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('g3_primary');
  const [classroom, setClassroom] = useState('3/أ');
  const [assignedTestId, setAssignedTestId] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Retake / Reset Modal State
  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Bulk Import state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const studentIdNum = s.nationalId || s.nationalIdMasked || '';
      const stuNumber = s.studentNumber || s.internalStudentId || '';
      const stuGrade = s.grade || s.gradeLevel || 'g3_primary';

      const matchSearch = 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentIdNum.includes(searchTerm) ||
        stuNumber.includes(searchTerm) ||
        (s.classroom && s.classroom.includes(searchTerm));

      const matchGrade = selectedGrade === 'all' || stuGrade === selectedGrade;

      return matchSearch && matchGrade;
    });
  }, [students, searchTerm, selectedGrade]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFullName('');
    setStudentNumber(`STU-${Math.floor(100 + Math.random() * 900)}`);
    setNationalId(`1${Math.floor(100000000 + Math.random() * 900000000)}`);
    setGradeLevel('g3_primary');
    setClassroom('3/أ');
    setAssignedTestId(tests[0]?.id || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFullName(s.fullName);
    setStudentNumber(s.studentNumber || s.internalStudentId || '');
    setNationalId(s.nationalId || s.nationalIdMasked || '');
    setGradeLevel((s.grade || s.gradeLevel || 'g3_primary') as GradeLevel);
    setClassroom(s.classroom || '');
    setAssignedTestId(s.assignedTestId || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveStudent = () => {
    if (!fullName.trim()) {
      setFormError('يرجى إدخال اسم الطالب.');
      return;
    }
    if (!studentNumber.trim()) {
      setFormError('يرجى إدخال الرقم الداخلي للطالب.');
      return;
    }
    if (!nationalId.trim()) {
      setFormError('يرجى إدخال رقم الهوية.');
      return;
    }

    const savedStudent: Student = {
      id: editingStudent ? editingStudent.id : `stu_${Date.now()}`,
      fullName: fullName.trim(),
      studentNumber: studentNumber.trim(),
      internalStudentId: studentNumber.trim(),
      nationalId: nationalId.trim(),
      nationalIdMasked: nationalId.trim(),
      grade: gradeLevel,
      gradeLevel: gradeLevel,
      classroom: classroom.trim() || '1/أ',
      assignedTestId: assignedTestId || undefined,
      status: editingStudent ? editingStudent.status : 'not_started',
      gender: 'male',
    };

    if (editingStudent) {
      onUpdateStudent(savedStudent);
    } else {
      onAddStudent(savedStudent);
    }
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        data.forEach((row: any, idx: number) => {
          const name = row['الاسم'] || row['Name'] || row['Full Name'];
          if (name) {
            const num = row['الرقم الداخلي'] || row['ID'] || `STU-${Date.now()}-${idx}`;
            const nid = row['رقم الهوية'] || row['National ID'] || '';
            const gradeRaw = row['الصف'] || row['Grade'] || 'g3_primary';
            const cls = row['الفصل'] || row['Class'] || '1/أ';

            // تحويل مسميات الصفوف العربية إلى الرموز إذا لزم الأمر
            let gradeCode: GradeLevel = 'g3_primary';
            if (Object.keys(GRADE_LABELS).includes(gradeRaw)) {
              gradeCode = gradeRaw as GradeLevel;
            } else {
              // محاولة المطابقة بالاسم
              const entry = Object.entries(GRADE_LABELS).find(([key, val]) => val.includes(gradeRaw));
              if (entry) gradeCode = entry[0] as GradeLevel;
            }

            onAddStudent({
              id: `stu_excel_${Date.now()}_${idx}`,
              fullName: name,
              studentNumber: String(num),
              internalStudentId: String(num),
              nationalId: String(nid),
              nationalIdMasked: String(nid),
              grade: gradeCode,
              gradeLevel: gradeCode,
              classroom: String(cls),
              status: 'not_started',
              gender: 'male',
            });
          }
        });
        alert(`تم استيراد ${data.length} طالب بنجاح!`);
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة ملف الإكسل. تأكد من الصيغة الصحيحة.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'الاسم': 'أحمد محمد العلي',
        'الرقم الداخلي': 'STU-1001',
        'رقم الهوية': '1098765432',
        'الصف': 'g3_primary',
        'الفصل': '3/أ'
      },
      {
        'الاسم': 'خالد فهد الدوسري',
        'الرقم الداخلي': 'STU-1002',
        'رقم الهوية': '1087654321',
        'الصف': 'g4_primary',
        'الفصل': '4/ب'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "طلاب_موهبة_نموذج.xlsx");
  };

  const handleBulkImportText = () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText.trim().split('\n');
    let count = 0;

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      if (parts.length >= 1 && parts[0]) {
        const studentName = parts[0];
        const num = parts[1] || `STU-${100 + idx}`;
        const nid = parts[2] || `10${Math.floor(10000000 + Math.random() * 90000000)}`;
        const gr = (parts[3] as GradeLevel) || 'g3_primary';
        const cls = parts[4] || '1/أ';

        onAddStudent({
          id: `stu_bulk_${Date.now()}_${idx}`,
          fullName: studentName,
          studentNumber: num,
          internalStudentId: num,
          nationalId: nid,
          nationalIdMasked: nid,
          grade: gr,
          gradeLevel: gr,
          classroom: cls,
          status: 'not_started',
          gender: 'male',
        });
        count++;
      }
    });

    setBulkInputText('');
    setIsBulkImportOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* شريط الأزرار الواضحة وأداة البحث */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* أزرار الإجراءات الرئيسية */}
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة طالب</span>
          </button>

          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isImporting ? 'جاري الاستيراد...' : 'رفع إكسل'}</span>
            </button>
          </div>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
            title="تحميل نموذج ملف الإكسل"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">نموذج الإكسل</span>
          </button>

          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>لصق قائمة</span>
          </button>
        </div>

        {/* حقل البحث وتصفية الصف */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الطالب، الرقم الداخلي، الهوية..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="all">كافة الصفوف</option>
            {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(gr => (
              <option key={gr} value={gr}>{GRADE_LABELS[gr]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* جدول الطلاب البسيط */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            {/* رأس الجدول: | الطالب | الصف | الفصل | الرقم | الاختبارات | الإجراءات | */}
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">الطالب</th>
                <th className="px-4 py-3.5">الصف</th>
                <th className="px-4 py-3.5">الفصل</th>
                <th className="px-4 py-3.5">الرقم</th>
                <th className="px-4 py-3.5">الحالة</th>
                <th className="px-4 py-3.5">الاختبارات</th>
                <th className="px-5 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    لا يوجد طلاب مطابقون للبحث.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const stuGrade = (student.grade || student.gradeLevel || 'g3_primary') as GradeLevel;
                  const assignedTest = tests.find(t => t.id === student.assignedTestId) || tests[0];
                  const isCompleted = student.status === 'completed';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                      {/* 1. الطالب (الاسم ورقم الهوية) */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          هوية: {student.nationalId || student.nationalIdMasked || '-'}
                        </div>
                      </td>

                      {/* 2. الصف */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {GRADE_LABELS[stuGrade]}
                      </td>

                      {/* 3. الفصل */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {student.classroom || '-'}
                      </td>

                      {/* 4. الرقم الداخلي */}
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {student.studentNumber || student.internalStudentId || '-'}
                      </td>

                      {/* 5. الحالة */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isCompleted 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50'
                        }`}>
                          {isCompleted ? 'مكتمل' : 'متاح'}
                        </span>
                      </td>

                      {/* 6. الاختبارات */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isCompleted) {
                                setStudentToReset(student);
                              } else {
                                onLaunchExamForStudent(student, assignedTest?.id || '');
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                            }`}
                            title={isCompleted ? 'انقر لإعادة الاختبار لهذا الطالب' : 'بدء الاختبار لهذا الطالب'}
                          >
                            {isCompleted ? <RotateCcw className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            <span>{isCompleted ? 'إعادة الاختبار' : (assignedTest ? assignedTest.title : 'بدء الاختبار')}</span>
                          </button>
                        </div>
                      </td>

                      {/* 7. الإجراءات */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isCompleted && (
                            <button
                              onClick={() => setStudentToReset(student)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="إعادة تعيين الحالة (فتح الاختبار مجدداً)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إضافة / تعديل طالب (الاسم | الرقم الداخلي | رقم الهوية | الصف | الفصل) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {editingStudent ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* 1. الاسم */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الرباعي للطالب *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="مثال: تركي فهد الدوسري"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* 2. الرقم الداخلي */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرقم الداخلي للطالب *
                </label>
                <input
                  type="text"
                  value={studentNumber}
                  onChange={e => setStudentNumber(e.target.value)}
                  placeholder="مثال: STU-2026-031"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* 3. رقم الهوية */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهوية الوطنية / السجل المدني *
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                  placeholder="10 أرقام"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* 4. الصف */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الصف الدراسي *
                </label>
                <select
                  value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value as GradeLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(gr => (
                    <option key={gr} value={gr}>{GRADE_LABELS[gr]}</option>
                  ))}
                </select>
              </div>

              {/* 5. الفصل */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفصل / الشعبة *
                </label>
                <input
                  type="text"
                  value={classroom}
                  onChange={e => setClassroom(e.target.value)}
                  placeholder="مثال: 3/أ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* الاختبار المسند (اختياري) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاختبار المسند
                </label>
                <select
                  value={assignedTestId}
                  onChange={e => setAssignedTestId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">اختيار تلقائي</option>
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveStudent}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ البيانات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة استيراد الطلاب الجماعي */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-600" />
                <span>استيراد قائمة الطلاب</span>
              </h3>
              <button
                onClick={() => setIsBulkImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                الصق بيانات الطلاب مفصولة بفواصل أو مسافات بالترتيب:
              </p>
              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-500 font-mono text-[11px]">
                الاسم ، الرقم الداخلي ، رقم الهوية ، رمز الصف ، الفصل
              </div>
              <textarea
                rows={6}
                value={bulkInputText}
                onChange={e => setBulkInputText(e.target.value)}
                placeholder="عبدالله محمد الدوسري, STU-101, 1098234121, g3_primary, 3/أ&#10;خالد فهد القحطاني, STU-102, 1087654321, g4_primary, 4/ب"
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsBulkImportOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkImportText}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>استيراد الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Confirmation Modal */}
      {studentToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                تأكيد إعادة الاختبار للطالب
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                هل ترغب في إعادة تعيين حالة الطالب <strong className="text-slate-900 dark:text-white font-bold">{studentToReset.fullName}</strong>؟
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed text-right space-y-1">
              <div className="font-bold flex items-center gap-1">
                <span>⚠️ ماذا يحدث عند التأكيد؟</span>
              </div>
              <p>• سيتم حذف نتيجة الاختبار السابقة لهذا الطالب.</p>
              <p>• يُفتح الاختبار فوراً ليتمكن الطالب من أداء محاولة جديدة بأسئلة متنوعة ومتوازنة.</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStudentToReset(null)}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetStudentTest) {
                    onResetStudentTest(studentToReset.id);
                  } else {
                    onUpdateStudent({ ...studentToReset, status: 'not_started' });
                  }
                  setFeedbackToast(`تمت إعادة تعيين حالة الطالب "${studentToReset.fullName}" بنجاح، ويمكنه الآن بدء الاختبار مجدداً.`);
                  setStudentToReset(null);
                  setTimeout(() => setFeedbackToast(null), 5000);
                }}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
              >
                تأكيد وفتح الاختبار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};
