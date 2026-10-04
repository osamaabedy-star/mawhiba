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
  RotateCcw,
  Users,
  GraduationCap,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  tests: Test[];
  onAddStudent: (student: Student) => void;
  onAddMultipleStudents?: (students: Student[]) => void;
  onUpdateStudent: (student: Student) => void;
  onUpdateMultipleStudents?: (students: Student[]) => void;
  onDeleteStudent: (studentId: string) => void;
  onLaunchExamForStudent: (student: Student, testId: string, modelId?: string) => void;
  onResetStudentTest?: (studentId: string) => void;
  onDeleteMultipleStudents?: (studentIds: string[]) => void;
}

/**
 * إدارة الطلاب - منصة الموهوبين
 * يدعم إضافة الطلاب يدوياً أو عبر استيراد ملف Excel أو توليد وإضافة طلاب صف كامل بنقرة واحدة
 */
export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  tests,
  onAddStudent,
  onAddMultipleStudents,
  onUpdateStudent,
  onUpdateMultipleStudents,
  onDeleteStudent,
  onLaunchExamForStudent,
  onResetStudentTest,
  onDeleteMultipleStudents,
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
  const [bulkGrade, setBulkGrade] = useState<GradeLevel>('g3_primary');
  const [bulkSection, setBulkSection] = useState<string>('3/أ');
  const [bulkGender, setBulkGender] = useState<'male' | 'female'>('male');
  const [bulkAssignedTestId, setBulkAssignedTestId] = useState<string>('');
  const [bulkIdPrefix, setBulkIdPrefix] = useState<string>('STU-');
  const [isImporting, setIsImporting] = useState(false);

  // Assign Test to Classes Modal state
  const [isAssignClassModalOpen, setIsAssignClassModalOpen] = useState(false);
  const [targetAssignTestId, setTargetAssignTestId] = useState<string>('');
  const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);

  // Unique classes / sections detected from existing students
  const uniqueClasses = useMemo(() => {
    const map = new Map<string, { key: string; grade: GradeLevel; classroom: string; count: number; studentIds: string[]; currentTestId?: string }>();
    students.forEach(s => {
      const g = (s.gradeLevel || s.grade || 'g3_primary') as GradeLevel;
      const c = s.classroom || 'عام';
      const key = `${g}___${c}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.studentIds.push(s.id);
        if (s.assignedTestId && !existing.currentTestId) existing.currentTestId = s.assignedTestId;
      } else {
        map.set(key, {
          key,
          grade: g,
          classroom: c,
          count: 1,
          studentIds: [s.id],
          currentTestId: s.assignedTestId,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.classroom.localeCompare(b.classroom));
  }, [students]);

  // Add Whole Class Modal state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [classGrade, setClassGrade] = useState<GradeLevel>('g3_primary');
  const [classSection, setClassSection] = useState('3/أ');
  const [classStudentCount, setClassStudentCount] = useState<number>(25);
  const [classAssignedTestId, setClassAssignedTestId] = useState<string>('');
  const [classNamesText, setClassNamesText] = useState<string>('');

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

  const handleSaveStudent = (launchImmediately: boolean = false) => {
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

    const isPrevCompleted = editingStudent?.status === 'completed';
    const finalStatus = launchImmediately ? 'not_started' : (editingStudent ? editingStudent.status : 'not_started');

    const savedStudent: Student = {
      id: editingStudent ? editingStudent.id : `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: fullName.trim(),
      studentNumber: studentNumber.trim(),
      internalStudentId: studentNumber.trim(),
      nationalId: nationalId.trim(),
      nationalIdMasked: nationalId.trim(),
      grade: gradeLevel,
      gradeLevel: gradeLevel,
      classroom: classroom.trim() || '1/أ',
      assignedTestId: assignedTestId || undefined,
      status: finalStatus,
      gender: 'male',
    };

    if (editingStudent) {
      if (launchImmediately && isPrevCompleted && onResetStudentTest) {
        onResetStudentTest(editingStudent.id);
      }
      onUpdateStudent(savedStudent);
    } else {
      onAddStudent(savedStudent);
    }
    setIsModalOpen(false);

    if (launchImmediately) {
      const targetTestId = assignedTestId || tests[0]?.id || '';
      onLaunchExamForStudent(savedStudent, targetTestId);
    }
  };

  // Helper to normalize Arabic text thoroughly (numerals, hamzas, taa marbuta, alef maksura, diacritics)
  const cleanArabicText = (str: any): string => {
    if (!str && str !== 0) return '';
    return String(str)
      .trim()
      .toLowerCase()
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel/diacritics
      .replace(/[ـ\-_/\\|;:,.)(]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Intelligent helper to extract values from Excel row with fuzzy headers
  const getRowValue = (row: any, possibleNames: string[]): string => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    const cleanedTargets = possibleNames.map(cleanArabicText);

    // 1. Exact match (cleaned Arabic)
    for (const key of keys) {
      const cleanKey = cleanArabicText(key);
      for (const target of cleanedTargets) {
        if (cleanKey === target) {
          const val = row[key];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
    }
    // 2. Contains match (cleaned Arabic)
    for (const key of keys) {
      const cleanKey = cleanArabicText(key);
      for (const target of cleanedTargets) {
        if (cleanKey.includes(target) || target.includes(cleanKey)) {
          const val = row[key];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
    }
    return '';
  };

  // Comprehensive Grade Detector from any Arabic/English text, classroom string, or sheet context
  const parseGradeFromText = (gradeInput: string = '', classInput: string = '', sheetContext: string = ''): GradeLevel => {
    const combined = cleanArabicText(`${gradeInput} ${classInput} ${sheetContext}`);
    if (!combined) return 'g3_primary';

    // 1. Check direct GradeLevel keys
    if (combined.includes('g3_primary')) return 'g3_primary';
    if (combined.includes('g4_primary')) return 'g4_primary';
    if (combined.includes('g5_primary')) return 'g5_primary';
    if (combined.includes('g6_primary')) return 'g6_primary';
    if (combined.includes('g1_middle')) return 'g1_middle';
    if (combined.includes('g2_middle')) return 'g2_middle';
    if (combined.includes('g3_middle')) return 'g3_middle';

    // 2. Check Middle / Intermediate School (المرحلة المتوسطة)
    if (combined.includes('متوسط') || combined.includes(' م ') || combined.includes('م/') || /1\s*م/.test(combined) || /2\s*م/.test(combined) || /3\s*م/.test(combined)) {
      if (combined.includes('ثالث') || /(?:^|\D)3(?:\D|$)/.test(combined) || /(?:^|\D)9(?:\D|$)/.test(combined)) {
        return 'g3_middle';
      }
      if (combined.includes('ثاني') || combined.includes('ثان') || /(?:^|\D)2(?:\D|$)/.test(combined) || /(?:^|\D)8(?:\D|$)/.test(combined)) {
        return 'g2_middle';
      }
      if (combined.includes('اول') || /(?:^|\D)1(?:\D|$)/.test(combined) || /(?:^|\D)7(?:\D|$)/.test(combined)) {
        return 'g1_middle';
      }
      return 'g1_middle';
    }

    // 3. Primary Schools (الابتدائي) - check in order of specificity
    // Sixth (سادس أو 6)
    if (combined.includes('سادس') || /(?:^|\D)6(?:\D|$)/.test(combined)) {
      return 'g6_primary';
    }
    // Fifth (خامس أو 5)
    if (combined.includes('خامس') || /(?:^|\D)5(?:\D|$)/.test(combined)) {
      return 'g5_primary';
    }
    // Fourth (رابع أو 4)
    if (combined.includes('رابع') || /(?:^|\D)4(?:\D|$)/.test(combined)) {
      return 'g4_primary';
    }
    // Third (ثالث أو 3)
    if (combined.includes('ثالث') || /(?:^|\D)3(?:\D|$)/.test(combined)) {
      return 'g3_primary';
    }

    return 'g3_primary';
  };

  // Robust Multi-Sheet & Any Header-Offset Excel Importer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const newStudents: Student[] = [];
        const gradeStats: Record<string, number> = {};
        let studentSerial = 1;

        // Iterate through ALL sheets in the workbook (supports multi-grade workbooks!)
        for (const wsname of wb.SheetNames) {
          const ws = wb.Sheets[wsname];
          if (!ws) continue;

          // Check if sheet name indicates a grade (e.g. "الصف الرابع", "رابع ابتدائي", "Grade 4")
          const sheetNameGrade = parseGradeFromText('', '', wsname);
          const hasSheetGrade = wsname.includes('رابع') || wsname.includes('خامس') || wsname.includes('سادس') || wsname.includes('متوسط') || wsname.includes('ثالث');

          // Read sheet as 2D array of rows to bypass any school header banners or merged titles
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) continue;

          // Scan first 15 rows for the actual column header row
          let headerRowIdx = -1;
          let bannerGrade: GradeLevel | null = null;

          for (let r = 0; r < Math.min(15, rawRows.length); r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;

            const rowText = row.map(c => cleanArabicText(c)).join(' ');

            // Check if top banner mentions a grade (e.g. "كشف درجات الصف الرابع الابتدائي")
            if (!bannerGrade && (rowText.includes('الصف') || rowText.includes('مرحله')) && (rowText.includes('رابع') || rowText.includes('خامس') || rowText.includes('سادس') || rowText.includes('متوسط') || rowText.includes('ثالث'))) {
              bannerGrade = parseGradeFromText(rowText);
            }

            // Check if this row looks like the table header
            const isHeader = row.some(cell => {
              const cleaned = cleanArabicText(cell);
              return (
                cleaned.includes('اسم') ||
                cleaned.includes('طالب') ||
                cleaned.includes('name') ||
                cleaned.includes('student') ||
                cleaned.includes('هويه') ||
                cleaned.includes('سجل') ||
                cleaned.includes('رقم') ||
                cleaned === 'م'
              );
            });

            if (isHeader) {
              headerRowIdx = r;
              break;
            }
          }

          // Case A: Table header row was found
          if (headerRowIdx !== -1) {
            const headerRow = rawRows[headerRowIdx].map(c => cleanArabicText(c));
            
            // Map column indices
            let nameCol = headerRow.findIndex(h => h.includes('اسم') || h.includes('طالب') || h.includes('name') || h.includes('student'));
            let gradeCol = headerRow.findIndex(h => h.includes('صف') || h.includes('مرحله') || h.includes('مستوي') || h.includes('grade') || h.includes('level'));
            let classCol = headerRow.findIndex(h => h.includes('فصل') || h.includes('شعبه') || h.includes('class') || h.includes('section'));
            let nidCol = headerRow.findIndex(h => h.includes('هويه') || h.includes('سجل') || h.includes('مدني') || h.includes('national'));
            let numCol = headerRow.findIndex(h => h.includes('رقم') || h.includes('اكاديمي') || h.includes('داخلي') || h.includes('id'));

            // Process data rows
            for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
              const row = rawRows[r];
              if (!Array.isArray(row) || row.length === 0) continue;

              const rawName = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
              // Skip empty rows or repeated headers
              if (!rawName || rawName === 'الاسم' || rawName === 'اسم الطالب' || rawName.length < 2) continue;

              const rawGrade = gradeCol !== -1 ? String(row[gradeCol] || '').trim() : '';
              let rawClass = classCol !== -1 ? String(row[classCol] || '').trim() : '';
              let rawNid = nidCol !== -1 ? String(row[nidCol] || '').trim() : '';
              let rawNum = numCol !== -1 ? String(row[numCol] || '').trim() : '';

              // Clean National ID (must be digits)
              const nidMatch = rawNid.match(/\b([12]\d{9})\b/) || rawNid.match(/\b(\d{10})\b/);
              const nationalId = nidMatch ? nidMatch[1] : `1${Math.floor(100000000 + Math.random() * 900000000)}`;

              // Clean Student Number
              const studentNumber = rawNum || `STU-${Date.now().toString().slice(-4)}-${studentSerial}`;

              // Determine Grade using comprehensive context
              const sheetContextGrade = hasSheetGrade ? sheetNameGrade : (bannerGrade || '');
              const gradeCode = parseGradeFromText(rawGrade, rawClass, sheetContextGrade);
              const gradeLabel = GRADE_LABELS[gradeCode] || 'غير محدد';
              gradeStats[gradeLabel] = (gradeStats[gradeLabel] || 0) + 1;

              // Ensure clean classroom name (e.g. 4/أ, 4-1)
              if (!rawClass) {
                const digit = gradeCode.includes('4') ? '4' : gradeCode.includes('5') ? '5' : gradeCode.includes('6') ? '6' : gradeCode.includes('1_middle') ? '1/م' : gradeCode.includes('2_middle') ? '2/م' : gradeCode.includes('3_middle') ? '3/م' : '3';
                rawClass = `${digit}/أ`;
              }

              newStudents.push({
                id: `stu_excel_${Date.now()}_${studentSerial}_${Math.random().toString(36).substring(2, 5)}`,
                fullName: rawName,
                studentNumber,
                internalStudentId: studentNumber,
                nationalId,
                nationalIdMasked: nationalId,
                grade: gradeCode,
                gradeLevel: gradeCode,
                classroom: rawClass,
                status: 'not_started',
                gender: 'male',
              });
              studentSerial++;
            }
          } else {
            // Case B: Fallback to standard sheet_to_json if header row wasn't at the top
            const jsonRows = XLSX.utils.sheet_to_json(ws);
            jsonRows.forEach((row: any) => {
              const name = getRowValue(row, ['الاسم', 'اسم الطالب', 'اسم الطالب رباعي', 'اسم الطالب كامل', 'الاسم الكامل', 'طالب', 'الطالب', 'name', 'student name', 'student']);
              if (!name) return;

              const num = getRowValue(row, ['الرقم الداخلي', 'الرقم الأكاديمي', 'رقم الطالب', 'الرقم', 'student id', 'student number', 'id']) || `STU-${Date.now().toString().slice(-4)}-${studentSerial}`;
              let nid = getRowValue(row, ['رقم الهوية', 'الهوية', 'السجل المدني', 'رقم السجل المدني', 'الهوية الوطنية', 'national id', 'civil id']);
              if (!nid) nid = `1${Math.floor(100000000 + Math.random() * 900000000)}`;

              const gradeRaw = getRowValue(row, ['الصف', 'الصف الدراسي', 'المرحلة', 'المرحلة الدراسية', 'السنة', 'المستوى', 'grade', 'grade level', 'level']);
              let cls = getRowValue(row, ['الفصل', 'الفصل الدراسي', 'الشعبة', 'شعبة', 'فصل', 'class', 'classroom', 'section']);

              const sheetContextGrade = hasSheetGrade ? sheetNameGrade : '';
              const gradeCode = parseGradeFromText(gradeRaw, cls, sheetContextGrade);
              const gradeLabel = GRADE_LABELS[gradeCode] || 'غير محدد';
              gradeStats[gradeLabel] = (gradeStats[gradeLabel] || 0) + 1;

              if (!cls) {
                const digit = gradeCode.includes('4') ? '4' : gradeCode.includes('5') ? '5' : gradeCode.includes('6') ? '6' : gradeCode.includes('1_middle') ? '1/م' : '3';
                cls = `${digit}/أ`;
              }

              newStudents.push({
                id: `stu_excel_${Date.now()}_${studentSerial}_${Math.random().toString(36).substring(2, 5)}`,
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
              studentSerial++;
            });
          }
        }

        if (newStudents.length > 0) {
          if (onAddMultipleStudents) {
            onAddMultipleStudents(newStudents);
          } else {
            newStudents.forEach(s => onAddStudent(s));
          }

          const summaryList = Object.entries(gradeStats)
            .map(([gLabel, count]) => `${gLabel}: ${count} طالب`)
            .join(' | ');

          setFeedbackToast(`🎉 تم استيراد وتوزيع ${newStudents.length} طالباً بنجاح حسب صفوفهم بالإكسل: (${summaryList})`);
          setTimeout(() => setFeedbackToast(null), 7000);
        } else {
          alert('لم يتم العثور على أي أسماء صالحة في ملف الإكسل. يرجى التأكد من وجود عمود (الاسم) أو (اسم الطالب).');
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة ملف الإكسل. تأكد من الصيغة الصحيحة للملف.');
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
        'اسم الطالب': 'أحمد محمد العلي',
        'الرقم الداخلي': 'STU-1001',
        'رقم الهوية': '1098765432',
        'الصف': 'الصف الثالث الابتدائي',
        'الفصل': '3/أ'
      },
      {
        'اسم الطالب': 'خالد فهد الدوسري',
        'الرقم الداخلي': 'STU-1002',
        'رقم الهوية': '1087654321',
        'الصف': 'الصف الرابع الابتدائي',
        'الفصل': '4/ب'
      },
      {
        'اسم الطالب': 'سعود عبدالعزيز الشمري',
        'الرقم الداخلي': 'STU-1003',
        'رقم الهوية': '1076543210',
        'الصف': 'الصف الخامس الابتدائي',
        'الفصل': '5/أ'
      },
      {
        'اسم الطالب': 'تركي عبدالرحمن الغامدي',
        'الرقم الداخلي': 'STU-1004',
        'رقم الهوية': '1065432109',
        'الصف': 'الصف السادس الابتدائي',
        'الفصل': '6/ج'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "نموذج_استيراد_الطلاب_موهبة.xlsx");
  };

  // Smart Auto-Parser for Bulk Pasted Student Names + National IDs (supports Noor columns, numbering, tabs, etc.)
  const parsedBulkStudents = useMemo(() => {
    if (!bulkInputText.trim()) return [];
    const lines = bulkInputText.split('\n');
    const result: Array<{
      tempId: string;
      fullName: string;
      studentNumber: string;
      nationalId: string;
      grade: GradeLevel;
      classroom: string;
      assignedTestId?: string;
      gender: 'male' | 'female';
      hasRealNationalId: boolean;
    }> = [];

    let validIndex = 0;
    const startNum = 100 + students.length + 1;

    for (const line of lines) {
      let raw = line.trim();
      if (!raw) continue;

      // 1. Detect 10-digit Saudi national ID (starts with 1 or 2, 10 digits) or any 10-digit sequence
      let nationalId = '';
      let hasRealId = false;
      const nationalIdMatch = raw.match(/\b([12]\d{9})\b/) || raw.match(/\b(\d{10})\b/);
      if (nationalIdMatch) {
        nationalId = nationalIdMatch[1];
        hasRealId = true;
        // Remove the national ID from the raw string so only the name/other parts remain
        raw = raw.replace(nationalIdMatch[0], ' ');
      }

      // 2. Detect possible section like (3/أ, 1/م/2, 4/ب, 3-أ)
      let detectedClassroom = bulkSection || '3/أ';
      const sectionMatch = raw.match(/([1-6]\s*[\/\\-]\s*[أ-يa-zA-Z](?:\s*[\/\\-]\s*\d)?)/);
      if (sectionMatch) {
        detectedClassroom = sectionMatch[1].replace(/\s+/g, '');
        raw = raw.replace(sectionMatch[0], ' ');
      }

      // 3. Clean student name: remove leading numbers, dots, dashes, parentheses, Noor headers, bullets
      let cleanName = raw
        .replace(/[,\t|;]/g, ' ')
        .replace(/^[\s\d\-.)،:(•#\\]+/g, '')
        .replace(/[\d]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Skip invalid header lines or empty names
      if (!cleanName || cleanName.length < 2 || cleanName === 'الاسم' || cleanName === 'اسم الطالب' || cleanName === 'الهوية الوطنية') {
        continue;
      }

      // If no national ID was found on this line, generate a realistic 10-digit national ID
      if (!nationalId) {
        nationalId = `1${Math.floor(100000000 + Math.random() * 900000000)}`;
      }

      const studentNum = `${bulkIdPrefix || 'STU-'}${startNum + validIndex}`;

      // Detect grade from the line itself or from the detected section (fallback to bulkGrade)
      const detectedGrade = parseGradeFromText(line, detectedClassroom) || bulkGrade;

      result.push({
        tempId: `bulk_temp_${validIndex}`,
        fullName: cleanName,
        studentNumber: studentNum,
        nationalId,
        grade: detectedGrade,
        classroom: detectedClassroom,
        assignedTestId: bulkAssignedTestId || undefined,
        gender: bulkGender,
        hasRealNationalId: hasRealId,
      });
      validIndex++;
    }

    return result;
  }, [bulkInputText, bulkGrade, bulkSection, bulkGender, bulkAssignedTestId, bulkIdPrefix, students.length]);

  // Detect if any existing students are stuck on g3_primary despite having 4, 5, 6, or middle school in their classroom
  const needsGradeCorrectionCount = useMemo(() => {
    return students.filter(s => {
      const cls = s.classroom || '';
      const currentGrade = (s.gradeLevel || s.grade || 'g3_primary') as GradeLevel;
      if (currentGrade === 'g3_primary') {
        return cls.startsWith('4') || cls.startsWith('5') || cls.startsWith('6') || cls.includes('1/م') || cls.includes('2/م') || cls.includes('3/م') || cls.includes('رابع') || cls.includes('خامس') || cls.includes('سادس');
      }
      return false;
    }).length;
  }, [students]);

  // One-click Auto-Fix & Rebalance for existing students' grades
  const handleAutoFixExistingGrades = () => {
    let fixedCount = 0;
    const stats: Record<string, number> = {};
    const updated = students.map(s => {
      const cls = s.classroom || '';
      const currentGrade = (s.gradeLevel || s.grade || 'g3_primary') as GradeLevel;
      
      let inferredGrade: GradeLevel | null = null;
      if (cls.startsWith('4') || cls.includes('/4') || cls.includes('-4') || cls.includes('رابع')) inferredGrade = 'g4_primary';
      else if (cls.startsWith('5') || cls.includes('/5') || cls.includes('-5') || cls.includes('خامس')) inferredGrade = 'g5_primary';
      else if (cls.startsWith('6') || cls.includes('/6') || cls.includes('-6') || cls.includes('سادس')) inferredGrade = 'g6_primary';
      else if (cls.includes('1/م') || cls.includes('1م') || cls.includes('اول متوسط')) inferredGrade = 'g1_middle';
      else if (cls.includes('2/م') || cls.includes('2م') || cls.includes('ثاني متوسط')) inferredGrade = 'g2_middle';
      else if (cls.includes('3/م') || cls.includes('3م') || cls.includes('ثالث متوسط')) inferredGrade = 'g3_middle';
      else if (cls.startsWith('3') || cls.includes('/3') || cls.includes('ثالث')) inferredGrade = 'g3_primary';

      if (inferredGrade && inferredGrade !== currentGrade) {
        fixedCount++;
        const label = GRADE_LABELS[inferredGrade] || inferredGrade;
        stats[label] = (stats[label] || 0) + 1;
        return {
          ...s,
          grade: inferredGrade,
          gradeLevel: inferredGrade,
        };
      }
      return s;
    });

    if (fixedCount > 0) {
      if (onUpdateMultipleStudents) {
        onUpdateMultipleStudents(updated);
      } else {
        updated.forEach(st => onUpdateStudent(st));
      }
      const summary = Object.entries(stats).map(([lbl, cnt]) => `${lbl}: ${cnt} طالب`).join(' | ');
      setFeedbackToast(`🎉 تم بنجاح تصحيح وتوزيع ${fixedCount} طالباً حسب فصولهم: (${summary})`);
      setTimeout(() => setFeedbackToast(null), 7000);
    } else {
      alert('جميع صفوف الطلاب مطابقة لفصولهم الحالية ولا توجد أي صفوف تحتاج لتصحيح.');
    }
  };

  // Change grade for an entire class directly
  const handleBatchChangeClassGrade = (classKey: string, newGrade: GradeLevel) => {
    const targetClass = uniqueClasses.find(c => c.key === classKey);
    if (!targetClass) return;
    const targetIds = new Set(targetClass.studentIds);
    const updated = students.map(s => {
      if (targetIds.has(s.id)) {
        return {
          ...s,
          grade: newGrade,
          gradeLevel: newGrade,
        };
      }
      return s;
    });
    if (onUpdateMultipleStudents) {
      onUpdateMultipleStudents(updated);
    } else {
      updated.forEach(s => onUpdateStudent(s));
    }
    setFeedbackToast(`✅ تم تغيير صف جميع طلاب فصل ${targetClass.classroom} (${targetClass.count} طالباً) إلى ${GRADE_LABELS[newGrade]}`);
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleCommitBulkImport = () => {
    if (parsedBulkStudents.length === 0) {
      alert('لم يتم التعرف على أي أسماء صالحة. يرجى لصق قائمة الأسماء سطراً بسطر.');
      return;
    }

    const newStudents: Student[] = parsedBulkStudents.map((item, idx) => ({
      id: `stu_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      fullName: item.fullName,
      studentNumber: item.studentNumber,
      internalStudentId: item.studentNumber,
      nationalId: item.nationalId,
      nationalIdMasked: item.nationalId,
      grade: item.grade,
      gradeLevel: item.grade,
      classroom: item.classroom,
      assignedTestId: item.assignedTestId,
      status: 'not_started',
      gender: item.gender,
    }));

    if (onAddMultipleStudents) {
      onAddMultipleStudents(newStudents);
    } else {
      newStudents.forEach(s => onAddStudent(s));
    }

    setFeedbackToast(`🎉 تمت إضافة ${newStudents.length} طالباً برقم الهوية بنجاح دفعة واحدة!`);
    setTimeout(() => setFeedbackToast(null), 4000);
    setBulkInputText('');
    setIsBulkImportOpen(false);
  };

  const handleInsertSampleBulkNames = () => {
    const samples = [
      'محمد عبدالله القحطاني 1083920194',
      'خالد فهد الدوسري 1094830291',
      'سعود عبدالعزيز الشمري 1072948301',
      'تركي عبدالرحمن الغامدي 1063920184',
      'عمر نايف الحربي 1054930281',
      'سلطان فيصل العتيبي 1045920173',
      'ريان إبراهيم الشهري 1036920162',
      'فهد مسفر السبيعي 1027920151',
      'عبدالرحمن أحمد الزهراني 1018920140',
      'بندر مشعل المطيري 1099920139',
      'ياسر صالح العمري 1088920128',
      'ماجد حمد الخالدي 1077920117'
    ];
    setBulkInputText(samples.join('\n'));
  };

  // Open modal to assign a test to whole classes/sections at once
  const handleOpenAssignClassModal = () => {
    setTargetAssignTestId(tests[0]?.id || '');
    // Select all classes by default for convenience
    setSelectedClassKeys(uniqueClasses.map(c => c.key));
    setIsAssignClassModalOpen(true);
  };

  // Commit assigning the selected test to all students belonging to the chosen classes
  const handleCommitAssignTestToClasses = () => {
    if (!targetAssignTestId) {
      alert('يرجى اختيار الاختبار المراد إسناده أولاً');
      return;
    }
    if (selectedClassKeys.length === 0) {
      alert('يرجى تحديد فصل دراسي واحد على الأقل');
      return;
    }

    const test = tests.find(t => t.id === targetAssignTestId);
    const affectedClasses = uniqueClasses.filter(c => selectedClassKeys.includes(c.key));
    const affectedStudentIds = new Set(affectedClasses.flatMap(c => c.studentIds));

    const updatedStudents = students
      .filter(s => affectedStudentIds.has(s.id))
      .map(s => ({
        ...s,
        assignedTestId: targetAssignTestId,
      }));

    if (onUpdateMultipleStudents) {
      onUpdateMultipleStudents(updatedStudents);
    } else {
      updatedStudents.forEach(s => onUpdateStudent(s));
    }

    setFeedbackToast(`✅ تم بنجاح إسناد اختبار (${test?.title || 'المحدد'}) لجميع طلاب ${affectedClasses.length} فصول (${updatedStudents.length} طالباً)!`);
    setTimeout(() => setFeedbackToast(null), 4500);
    setIsAssignClassModalOpen(false);
  };

  const SAUDI_BOY_FIRST_NAMES = [
    'محمد', 'عبدالله', 'فهد', 'سعود', 'خالد', 'فيصل', 'تركي', 'ريان', 'عمر', 'سليمان',
    'زياد', 'نايف', 'راكان', 'نواف', 'مشعل', 'بدر', 'يوسف', 'عبدالعزيز', 'سطام', 'بتال',
    'إبراهيم', 'سامي', 'تميم', 'معاذ', 'ماجد', 'أنس', 'مصعب', 'وليد', 'ياسر', 'حمزة',
    'علي', 'سالم', 'سلطان', 'حمد', 'ناصر'
  ];

  const SAUDI_FATHER_NAMES = [
    'صالح', 'ناصر', 'أحمد', 'سعد', 'فهد', 'ماجد', 'خالد', 'سلطان', 'منصور', 'حمد',
    'سالم', 'ظافر', 'علي', 'حسن', 'عبدالله', 'محمد', 'إبراهيم', 'سليمان', 'فيصل'
  ];

  const SAUDI_FAMILY_NAMES = [
    'القحطاني', 'العتيبي', 'الدوسري', 'الغامدي', 'الشهري', 'الزهراني', 'السبيعي', 'الشمري',
    'المطيري', 'العمري', 'الحارثي', 'المالكي', 'الحربي', 'القرني', 'العنزي', 'الخالدي',
    'السالم', 'التميمي', 'البقمي', 'السلمي', 'الجهني', 'العسيري', 'الهزاع', 'الصالح'
  ];

  const generateClassRoster = (count: number): string[] => {
    const result: string[] = [];
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let name = '';
      let attempts = 0;
      do {
        const first = SAUDI_BOY_FIRST_NAMES[(i * 3 + attempts) % SAUDI_BOY_FIRST_NAMES.length];
        const father = SAUDI_FATHER_NAMES[(i * 2 + attempts * 5) % SAUDI_FATHER_NAMES.length];
        const family = SAUDI_FAMILY_NAMES[(i + attempts * 7) % SAUDI_FAMILY_NAMES.length];
        name = `${first} ${father} ${family}`;
        attempts++;
      } while (used.has(name) && attempts < 30);
      used.add(name);
      result.push(name);
    }
    return result;
  };

  const openAddClassModal = (targetGrade?: GradeLevel) => {
    const gr = targetGrade || (selectedGrade !== 'all' ? selectedGrade as GradeLevel : 'g3_primary');
    setClassGrade(gr);
    let defaultSec = '3/أ';
    if (gr === 'g4_primary') defaultSec = '4/أ';
    else if (gr === 'g5_primary') defaultSec = '5/أ';
    else if (gr === 'g6_primary') defaultSec = '6/أ';
    else if (gr === 'g1_middle') defaultSec = '1/م/1';
    else if (gr === 'g2_middle') defaultSec = '2/م/1';
    else if (gr === 'g3_middle') defaultSec = '3/م/1';
    setClassSection(defaultSec);
    setClassStudentCount(25);
    const initialRoster = generateClassRoster(25);
    setClassNamesText(initialRoster.join('\n'));
    const matchingTest = tests.find(t => t.targetGrades.includes(gr)) || tests[0];
    setClassAssignedTestId(matchingTest?.id || '');
    setIsAddClassModalOpen(true);
  };

  const handleRegenerateRoster = (newCount?: number) => {
    const count = newCount !== undefined ? newCount : classStudentCount;
    setClassStudentCount(count);
    const roster = generateClassRoster(count);
    setClassNamesText(roster.join('\n'));
  };

  const handleCommitAddClass = () => {
    const lines = classNamesText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('يرجى التأكد من وجود أسماء للطلاب');
      return;
    }

    const startNum = 100 + students.length + 1;
    const cleanSection = classSection.trim() || '1/أ';
    const newStudents: Student[] = lines.map((name, idx) => {
      const studentNum = `STU-${startNum + idx}`;
      const nationalId = `1${Math.floor(100000000 + Math.random() * 900000000)}`;
      return {
        id: `stu_class_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        fullName: name,
        studentNumber: studentNum,
        internalStudentId: studentNum,
        nationalId: nationalId,
        nationalIdMasked: nationalId,
        grade: classGrade,
        gradeLevel: classGrade,
        classroom: cleanSection,
        assignedTestId: classAssignedTestId || undefined,
        status: 'not_started',
        gender: 'male',
      };
    });

    if (onAddMultipleStudents) {
      onAddMultipleStudents(newStudents);
    } else {
      newStudents.forEach(s => onAddStudent(s));
    }

    setFeedbackToast(`تمت إضافة جميع طلاب فصل ${cleanSection} (${newStudents.length} طالباً) بنجاح بنقرة واحدة!`);
    setTimeout(() => setFeedbackToast(null), 4000);
    setIsAddClassModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* شريط الأزرار الواضحة وأداة البحث */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* أزرار الإجراءات الرئيسية */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* PRIMARY BUTTON: ADD WHOLE CLASS WITH ONE CLICK */}
          <button
            onClick={() => openAddClassModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-sky-700 hover:from-indigo-700 hover:to-sky-800 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
            title="إضافة جميع طلاب فصل دراسي كامل بنقرة زر واحدة"
          >
            <Users className="w-4 h-4" />
            <span>إضافة طلاب صف كامل (زر واحد)</span>
          </button>

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

          {/* PROFESSIONAL BULK ADD BUTTON */}
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
            title="إضافة أسماء الطلاب برقم الهوية دفعة واحدة بنسخ ولصق سريع"
          >
            <Users className="w-4 h-4" />
            <span>إضافة أسماء الطلاب دفعة واحدة (لصق مباشر)</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">مع الهوية</span>
          </button>

          {/* ASSIGN TEST TO CLASSES BUTTON */}
          <button
            onClick={handleOpenAssignClassModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-violet-600/25 transition-all cursor-pointer"
            title="تحديد وإسناد الاختبار للفصول دفعة واحدة بدلاً من إضافة طلاب للاختبار"
          >
            <BookOpen className="w-4 h-4" />
            <span>تحديد الاختبار للفصول ({uniqueClasses.length} فصول)</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">إسناد جماعي</span>
          </button>

          {/* AUTO-FIX AND REBALANCE GRADES FOR EXISTING STUDENTS */}
          <button
            onClick={handleAutoFixExistingGrades}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition-all cursor-pointer"
            title="تصحيح وتوزيع صفوف جميع الطلاب المسجلين حالياً تلقائياً بناءً على فصولهم (مثال: فصل 4/أ إلى الصف الرابع)"
          >
            <Sparkles className="w-4 h-4" />
            <span>تصحيح وتوزيع الصفوف تلقائياً</span>
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

      {/* تنبيه ذكي إذا وجد طلاب مسجلين بفصول عليا مع صف ثالث */}
      {needsGradeCorrectionCount > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              تم رصد <strong>{needsGradeCorrectionCount}</strong> طالباً مسجلين بفصول مثل (رابع، خامس، سادس...) ولكن صفهم الحالي هو (ثالث ابتدائي).
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoFixExistingGrades}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ تصحيح وتوزيع صفوفهم فوراً الآن</span>
          </button>
        </div>
      )}

      {/* شريط الفصول وتوزيع الطلاب مع إمكانية تعديل صف الفصل بنقرة واحدة */}
      {uniqueClasses.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-600" />
              <span>فصول الطلاب المسجلة ({uniqueClasses.length} فصول - إجمالي {students.length} طالباً):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-bold">💡 يمكنك تعديل صف الفصل أو حذفه كاملاً:</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-1 max-h-56 overflow-y-auto custom-scrollbar">
            {uniqueClasses.map(c => (
              <div
                key={c.key}
                className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-xs transition-all hover:border-indigo-200"
              >
                <div className="flex flex-col">
                  <span className="text-slate-900 dark:text-white font-black">فصل {c.classroom}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{c.count} طالباً</span>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-700 mx-1"></div>
                
                <div className="flex items-center gap-1.5">
                  <select
                    value={c.grade}
                    onChange={e => handleBatchChangeClassGrade(c.key, e.target.value as GradeLevel)}
                    title="تغيير صف جميع طلاب هذا الفصل"
                    className="text-[11px] font-black text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-xl px-2.5 py-1 cursor-pointer hover:bg-sky-100 transition-colors"
                  >
                    {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => (
                      <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      if (confirm(`⚠️ تحذير: هل أنت متأكد من حذف كافة طلاب فصل ${c.classroom}؟ سيتم حذف (${c.count} طالباً) نهائياً من النظام.`)) {
                        if (onDeleteMultipleStudents) {
                          onDeleteMultipleStudents(c.studentIds);
                        } else {
                          c.studentIds.forEach(id => onDeleteStudent(id));
                        }
                        setFeedbackToast(`🗑️ تم حذف فصل ${c.classroom} بالكامل (${c.count} طالباً)`);
                        setTimeout(() => setFeedbackToast(null), 5000);
                      }
                    }}
                    className="p-1.5 px-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer border border-transparent hover:border-rose-200 flex items-center gap-1"
                    title="حذف هذا الفصل بجميع طلابه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase">حذف الفصل</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100'
                            }`}
                            title={isCompleted ? 'إعادة الاختبار لهذا الطالب' : 'بدء الاختبار لهذا الطالب'}
                          >
                            {isCompleted ? <RotateCcw className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            <span>{isCompleted ? 'اختباره مرة أخرى' : (assignedTest ? assignedTest.title : 'بدء الاختبار')}</span>
                          </button>
                        </div>
                      </td>

                      {/* 7. الإجراءات */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(student)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/60 font-bold text-[11px] transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب واختباره"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => {
                              if (isCompleted) {
                                setStudentToReset(student);
                              } else {
                                onLaunchExamForStudent(student, assignedTest?.id || '');
                              }
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer ${
                              isCompleted
                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border-emerald-200'
                                : 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 border-sky-200'
                            }`}
                            title={isCompleted ? 'إعادة اختبار الطالب' : 'اختبار الطالب الآن'}
                          >
                            {isCompleted ? <RotateCcw className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            <span>{isCompleted ? 'إعادة' : 'اختبار'}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الطالب ${student.fullName}؟`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveStudent(false)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4 text-sky-600" />
                  <span>حفظ البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveStudent(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
                  title="حفظ التعديلات وتشغيل الاختبار لهذا الطالب مباشرة"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>{editingStudent?.status === 'completed' ? 'حفظ وإعادة الاختبار فوراً' : 'حفظ واختبار الطالب الآن'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة استيراد وإضافة أسماء الطلاب دفعة واحدة الاحترافية */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                      إضافة أسماء الطلاب دفعة واحدة (لصق سريع)
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                      نظام ذكي
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    الصق أسماء الطلاب من نور أو الواتساب أو الإكسل، وسيقوم النظام بتنظيف الأسماء وتوليد الأرقام أوتوماتيكياً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Configuration Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              {/* Grade */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                  الصف الدراسي:
                </label>
                <select
                  value={bulkGrade}
                  onChange={e => {
                    const gr = e.target.value as GradeLevel;
                    setBulkGrade(gr);
                    if (gr === 'g3_primary') setBulkSection('3/أ');
                    else if (gr === 'g4_primary') setBulkSection('4/أ');
                    else if (gr === 'g5_primary') setBulkSection('5/أ');
                    else if (gr === 'g6_primary') setBulkSection('6/أ');
                    else if (gr.startsWith('g1_')) setBulkSection('1/م');
                    else if (gr.startsWith('g2_')) setBulkSection('2/م');
                    else if (gr.startsWith('g3_')) setBulkSection('3/م');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="g3_primary">الصف الثالث الابتدائي</option>
                  <option value="g4_primary">الصف الرابع الابتدائي</option>
                  <option value="g5_primary">الصف الخامس الابتدائي</option>
                  <option value="g6_primary">الصف السادس الابتدائي</option>
                  <option value="g1_middle">الأول متوسط</option>
                  <option value="g2_middle">الثاني متوسط</option>
                  <option value="g3_middle">الثالث متوسط</option>
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                  الشعبة / الفصل:
                </label>
                <input
                  type="text"
                  value={bulkSection}
                  onChange={e => setBulkSection(e.target.value)}
                  placeholder="مثال: 3/أ أو 4/ب"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                  النوع:
                </label>
                <select
                  value={bulkGender}
                  onChange={e => setBulkGender(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="male">بنين (طلاب)</option>
                  <option value="female">بنات (طالبات)</option>
                </select>
              </div>

              {/* Assigned Test */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                  الاختبار المسند (اختياري):
                </label>
                <select
                  value={bulkAssignedTestId}
                  onChange={e => setBulkAssignedTestId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- بدون إسناد حالي --</option>
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input Text Area with Sample Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>الصق قائمة أسماء الطلاب هنا (سطراً بسطر):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertSampleBulkNames}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                  >
                    <span>تجربة 12 اسماً نموذجياً</span>
                  </button>
                  {bulkInputText && (
                    <button
                      type="button"
                      onClick={() => setBulkInputText('')}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={5}
                value={bulkInputText}
                onChange={e => setBulkInputText(e.target.value)}
                placeholder="الصق الأسماء هنا بأي صيغة مباشرة...&#10;1- محمد عبدالله القحطاني&#10;2. خالد فهد الدوسري&#10;سعود عبدالعزيز الشمري&#10;تركي عبدالرحمن الغامدي"
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 font-bold">
                💡 يدعم النظام تلقائياً الترقيم (1- أو 1. أو أقواس) وسيقوم بتنظيفها، كما يدعم نسخ عمود كامل من إكسل أو نور.
              </p>
            </div>

            {/* Live Reactive Preview Section */}
            {parsedBulkStudents.length > 0 ? (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      معاينة البيانات المستخرجة ({parsedBulkStudents.length} طالباً):
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    جاهز للإضافة بنقرة واحدة ✓
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black border-b border-slate-200 dark:border-slate-700 text-[11px]">
                      <tr>
                        <th className="py-2 px-3 w-10">#</th>
                        <th className="py-2 px-3">اسم الطالب</th>
                        <th className="py-2 px-3">الرقم الأكاديمي</th>
                        <th className="py-2 px-3">الهوية الوطنية</th>
                        <th className="py-2 px-3">الصف والفصل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedBulkStudents.map((st, idx) => (
                        <tr key={st.tempId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-bold">
                          <td className="py-1.5 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-1.5 px-3 text-slate-900 dark:text-white">{st.fullName}</td>
                          <td className="py-1.5 px-3 font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">{st.studentNumber}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-500 text-[11px]">{st.nationalId}</td>
                          <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400 text-[10px]">
                            {GRADE_LABELS[st.grade]} ({st.classroom})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : bulkInputText.trim() ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-bold">
                ⚠️ لم يتم التعرف على أي أسماء صالحة في النص المدخل. يرجى التأكد من كتابة اسم واحد في كل سطر.
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              
              <button
                type="button"
                onClick={handleCommitBulkImport}
                disabled={parsedBulkStudents.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {parsedBulkStudents.length > 0 
                    ? `إضافة جميع الطلاب (${parsedBulkStudents.length} طالباً) الآن` 
                    : 'الصق الأسماء لتفعيل الإضافة'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة طلاب صف كامل بلمسة واحدة */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">إضافة طلاب صف كامل</h3>
                  <p className="text-[10px] text-slate-500 font-bold">توليد وتعيين اختبار لطلاب الفصل بضغطة زر واحدة</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>الصف الدراسي:</span>
                  </label>
                  <select 
                    value={classGrade} 
                    onChange={e => {
                      const newGr = e.target.value as GradeLevel;
                      setClassGrade(newGr);
                      const matchingTest = tests.find(t => t.targetGrades.includes(newGr)) || tests[0];
                      setClassAssignedTestId(matchingTest?.id || '');
                    }} 
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none ring-sky-500/20 focus:ring-4 transition-all"
                  >
                    {Object.entries(GRADE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500">الفصل (مثلاً 3/أ أو 2/م/1):</label>
                  <input 
                    type="text" 
                    value={classSection} 
                    onChange={e => setClassSection(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none ring-sky-500/20 focus:ring-4 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500">عدد طلاب الفصل:</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="5" 
                      max="40" 
                      value={classStudentCount} 
                      onChange={e => handleRegenerateRoster(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg w-10 text-center">{classStudentCount}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500">تعيين الاختبار المستهدف:</label>
                  <select 
                    value={classAssignedTestId} 
                    onChange={e => setClassAssignedTestId(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none ring-sky-500/20 focus:ring-4 transition-all"
                  >
                    <option value="">-- بدون اختبار حالياً --</option>
                    {tests.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500">أسماء الطلاب (مولدة تلقائياً):</label>
                  <button 
                    onClick={() => handleRegenerateRoster()} 
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>توليد أسماء جديدة</span>
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={classNamesText}
                  onChange={e => setClassNamesText(e.target.value)}
                  className="w-full flex-1 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold text-xs leading-relaxed outline-none"
                  placeholder="اسم كل طالب في سطر..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCommitAddClass}
                className="flex items-center gap-2 px-7 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>إضافة {classStudentCount} طالباً وتعميدهم للاختبار</span>
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

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStudentToReset(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
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
                  setFeedbackToast(`تم فتح الاختبار للطالب "${studentToReset.fullName}" بنجاح، ويمكنه التقدم للاختبار الآن.`);
                  setStudentToReset(null);
                  setTimeout(() => setFeedbackToast(null), 5000);
                }}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl cursor-pointer transition-colors text-center"
              >
                فتح الاختبار فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onResetStudentTest) {
                    onResetStudentTest(studentToReset.id);
                  }
                  const updatedStudent: Student = { ...studentToReset, status: 'not_started' };
                  onUpdateStudent(updatedStudent);
                  const targetTest = tests.find(t => t.id === studentToReset.assignedTestId) || tests[0];
                  setStudentToReset(null);
                  onLaunchExamForStudent(updatedStudent, targetTest?.id || '');
                }}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>بدء إعادة الاختبار فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TEST TO CLASSES DIRECTLY */}
      {isAssignClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-right max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    تحديد وإسناد الاختبار للفصول دفعة واحدة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    حدد الاختبار المطلوب ثم اختر الفصول لتطبيق الاختبار على كافة طلابها تلقائياً دون إضافة فردية.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignClassModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Test Selector */}
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 space-y-2">
              <label className="block text-xs font-black text-violet-900 dark:text-violet-300">
                اختر الاختبار المراد ربطه وإسناده للفصول:
              </label>
              <select
                value={targetAssignTestId}
                onChange={e => setTargetAssignTestId(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-black rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              >
                {tests.map(t => {
                  const primaryCode = t.models[0]?.code || t.code || t.id.slice(-6).toUpperCase();
                  const qCount = t.models[0]?.questionIds?.length || 0;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.title} [كود #{primaryCode}] - {qCount} سؤال ({t.targetGrades.map(g => GRADE_LABELS[g]).join(', ')})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Classes Selection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  حدد الفصول المستهدفة ({uniqueClasses.length} فصول مسجلة):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClassKeys(uniqueClasses.map(c => c.key))}
                    className="text-[11px] font-bold text-violet-600 hover:underline cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassKeys([])}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {uniqueClasses.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  لا توجد فصول أو طلاب مسجلين حالياً. أضف أسماء الطلاب أولاً عبر الزر الأخضر (لصق مباشر).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {uniqueClasses.map(c => {
                    const isSelected = selectedClassKeys.includes(c.key);
                    const currentTest = tests.find(t => t.id === c.currentTestId);
                    return (
                      <div
                        key={c.key}
                        onClick={() => {
                          setSelectedClassKeys(prev => 
                            isSelected ? prev.filter(k => k !== c.key) : [...prev, c.key]
                          );
                        }}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-violet-600 text-white' : 'border border-slate-300 text-transparent'}`}>
                            ✓
                          </div>
                          <div>
                            <div className="font-black text-xs">
                              فصل {c.classroom} ({GRADE_LABELS[c.grade] || c.grade})
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                              {c.count} طالباً
                              {currentTest && (
                                <span className="mr-1 text-indigo-600 dark:text-indigo-400">
                                  • الاختبار الحالي: {currentTest.title.slice(0, 16)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {c.count} طالب
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAssignClassModalOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCommitAssignTestToClasses}
                disabled={uniqueClasses.length === 0 || selectedClassKeys.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>إسناد الاختبار للفصول المحددة ({uniqueClasses.filter(c => selectedClassKeys.includes(c.key)).reduce((acc, c) => acc + c.count, 0)} طالب)</span>
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
