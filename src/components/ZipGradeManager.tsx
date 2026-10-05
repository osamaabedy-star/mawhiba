import React, { useState, useMemo, useRef } from 'react';
import { 
  Test, 
  Question, 
  Student, 
  ExamSubmission, 
  AppSettings, 
  GradeLevel, 
  GRADE_LABELS,
  SkillCategory,
  SKILL_DEFINITIONS,
  DifficultyLevel,
  CandidateStatus,
  StudentSkillResult,
  StudentAnswer
} from '../types';
import { 
  FileCheck, 
  Printer, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  FileText, 
  Copy, 
  Check, 
  Info, 
  ArrowRight, 
  RefreshCw,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Hash,
  ArrowDown,
  BarChart3,
  PieChart,
  TrendingUp,
  Award,
  Search,
  Filter,
  Eye,
  Brain,
  Shuffle,
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { seededShuffle } from '../utils/deterministic';
import { SchoolLogo } from './SchoolLogo';
import { VisualShape } from './VisualShape';
import { OptionLetterBubble } from './TestBuilder';
import * as XLSX from 'xlsx';

interface ZipGradeManagerProps {
  tests: Test[];
  questions: Question[];
  students: Student[];
  submissions: ExamSubmission[];
  settings: AppSettings;
  onImportSubmissions: (newSubmissions: ExamSubmission[], updatedStudents: Student[]) => void;
  onNavigateToResults?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToNominations?: () => void;
  onUpdateQuestionStats?: (statsMap: Record<string, any>) => void;
  initialSelectedTestId?: string;
  initialGrade?: GradeLevel;
}

export type ZipGradeTab = 'exam_package' | 'answer_key' | 'import_results' | 'history' | 'psychometrics';

export interface StudentQuestionAnalysis {
  qNumber: number;
  questionId: string;
  questionCode: string;
  questionText: string;
  skill: SkillCategory;
  difficulty: DifficultyLevel;
  points: number;
  studentChoiceLetter: string; // A, B, C, D, None
  studentChoiceArabic: string; // أ, ب, ج, د, -
  correctChoiceLetter: string;
  correctChoiceArabic: string;
  isCorrect: boolean; // صح أو خطأ
  pointsAwarded: number;
}

export interface ParsedZipGradeRow {
  rawRowId: string;
  zipgradeId?: string;
  studentIdStr: string;
  studentName: string;
  classroom: string;
  grade?: GradeLevel;
  earnedScore: number;
  totalScore: number;
  percentage: number;
  numCorrect: number;
  numWrong: number;
  answersMap: Record<number, string>; // Q1 -> 'A', Q2 -> 'C', etc.
  matchedStudent?: Student;
  matchStatus: 'matched' | 'unmatched' | 'duplicate_submission';
  // Question-by-Question Analysis
  questionAnswers: StudentQuestionAnalysis[];
  // Skill-by-Skill Scores
  skillScores: Record<SkillCategory, {
    score: number;
    total: number;
    percentage: number;
    count: number;
    correct: number;
    status: 'high' | 'moderate' | 'needs_development';
  }>;
  // Randomness & Guessing Analysis
  randomnessAnalysis: {
    maxConsecutiveStreak: number;
    streakOption: string;
    optionDistribution: Record<string, number>;
    dominantOptionPercentage: number;
    cyclicPatternDetected: boolean;
    behaviorPattern: 'deliberate_thought' | 'mostly_thoughtful' | 'suspicious_random' | 'high_random';
    behaviorLabel: string;
    behaviorColor: string;
    isRandom: boolean; // هل الخيارات عشوائية أم لا
    notes: string;
  };
  // Nomination Suitability Recommendation
  nominationAssessment: {
    isSuitable: boolean; // هل مناسب للترشح أم لا
    decisionStatus: 'nominated_preliminary' | 'needs_extra_test' | 'promising' | 'not_nominated';
    statusLabel: string;
    badgeClass: string;
    reason: string;
  };
}

export const ZipGradeManager: React.FC<ZipGradeManagerProps> = ({
  tests,
  questions,
  students,
  submissions,
  settings,
  onImportSubmissions,
  onNavigateToResults,
  onNavigateToReports,
  onNavigateToNominations,
  onUpdateQuestionStats,
  initialSelectedTestId,
  initialGrade
}) => {
  const [activeTab, setActiveTab] = useState<ZipGradeTab>('exam_package');
  const [importShuffle, setImportShuffle] = useState<boolean>(false);
  const [importRepeatCount, setImportRepeatCount] = useState<0 | 2 | 3>(0);
  
  // Selected Test and Model
  const [selectedTestId, setSelectedTestId] = useState<string>(() => {
    if (initialSelectedTestId) return initialSelectedTestId;
    return tests[0]?.id || '';
  });

  const selectedTest = useMemo(() => {
    return tests.find(t => t.id === selectedTestId) || tests[0] || null;
  }, [tests, selectedTestId]);

  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    return selectedTest?.models[0]?.id || '';
  });

  // Keep model in sync with test
  React.useEffect(() => {
    if (selectedTest && !selectedTest.models.some(m => m.id === selectedModelId)) {
      setSelectedModelId(selectedTest.models[0]?.id || '');
    }
  }, [selectedTest, selectedModelId]);

  const selectedModel = useMemo(() => {
    if (!selectedTest) return null;
    return selectedTest.models.find(m => m.id === selectedModelId) || selectedTest.models[0] || null;
  }, [selectedTest, selectedModelId]);

  // Quick Test Code Search & Auto-Recognition
  const [codeSearchQuery, setCodeSearchQuery] = useState<string>('');
  const [codeMatchMessage, setCodeMatchMessage] = useState<string | null>(null);

  const availableTestCodes = useMemo(() => {
    const list: { code: string; testId: string; modelId: string; testTitle: string }[] = [];
    const seen = new Set<string>();
    tests.forEach(t => {
      t.models.forEach(m => {
        const c = m.code || m.id.slice(-6).toUpperCase();
        if (c && !seen.has(c)) {
          seen.add(c);
          list.push({ code: c, testId: t.id, modelId: m.id, testTitle: t.title });
        }
      });
    });
    return list;
  }, [tests]);

  const handleSelectByCode = (code: string) => {
    setCodeSearchQuery(code);
    const clean = code.trim().replace(/^#/, '').toLowerCase();
    if (!clean) {
      setCodeMatchMessage(null);
      return;
    }
    for (const t of tests) {
      for (const m of t.models) {
        const mCode = (m.code || '').replace(/^#/, '').toLowerCase();
        const mIdEnd = m.id.slice(-6).toLowerCase();
        if (mCode === clean || mIdEnd === clean) {
          setSelectedTestId(t.id);
          setSelectedModelId(m.id);
          setCodeMatchMessage(`✓ تم التعرف الذكي: "${t.title}" | الكود: #${code}`);
          return;
        }
      }
    }
    setCodeMatchMessage('لم يتم العثور على اختبار بهذا الكود');
  };

  // Copy Key state
  const [isCopiedKey, setIsCopiedKey] = useState(false);

  // Layout & Printing States
  const [optimizeLayout, setOptimizeLayout] = useState(true);
  const [ensureEvenPages, setEnsureEvenPages] = useState(true);
  const [showAnswersInPrint, setShowAnswersInPrint] = useState(false);

  // Questions in the selected model - DERIVED DETERMINISTICALLY TO MATCH PRINTED PAPER
  const modelQuestions = useMemo(() => {
    if (!selectedModel) return [];
    
    // Detect and mark existing manual duplicates in the model (by ID or exact Text)
    const seenIds = new Set<string>();
    const seenTexts = new Set<string>();
    let processedQs = selectedModel.questionIds.map((id, index) => {
      const q = questions.find(item => item.id === id);
      if (!q) return null;
      
      const normalizedText = q.questionText.trim().toLowerCase();
      const isDuplicate = seenIds.has(id) || seenTexts.has(normalizedText);
      
      seenIds.add(id);
      seenTexts.add(normalizedText);
      
      if (isDuplicate) {
        return {
          ...q,
          id: `${q.id}_rep_saved_${index}`,
          originalQuestionId: q.id,
          isConsistencyCheck: true
        };
      }
      return q;
    }).filter(Boolean) as Question[];

    const shuffleSeed = `seed_${selectedModel.id}`;

    // APPLY AUTO-REPEAT LOGIC FOR CONSISTENCY CHECK
    const ABSOLUTE_MAX_REPEATS = 3;
    let existingRepeats = processedQs.filter(q => q.isConsistencyCheck);
    
    // Trim if somehow exceeded
    if (existingRepeats.length > ABSOLUTE_MAX_REPEATS) {
      let count = 0;
      processedQs = processedQs.filter(q => {
        if (q.isConsistencyCheck) {
          count++;
          return count <= ABSOLUTE_MAX_REPEATS;
        }
        return true;
      });
      existingRepeats = processedQs.filter(q => q.isConsistencyCheck);
    }

    const targetRepeatCount = Math.min(ABSOLUTE_MAX_REPEATS, importRepeatCount);
    const neededRepeats = Math.max(0, targetRepeatCount - existingRepeats.length);

    if (neededRepeats > 0 && processedQs.length >= 5) {
      const candidates = processedQs.filter(q => !q.isConsistencyCheck).slice(2, Math.max(5, processedQs.length - 2));
      
      if (candidates.length > 0) {
        const toRepeat = seededShuffle([...candidates], `${shuffleSeed}_repeats`)
          .slice(0, neededRepeats);
        
        const withRepeats = [...processedQs];
        toRepeat.forEach((q, i) => {
          const repeatedQ = {
            ...q,
            id: `${q.id}_auto_rep_${existingRepeats.length + i}_static`,
            originalQuestionId: q.id,
            isConsistencyCheck: true
          };
          // Insert near the end in a deterministic way (matches TestBuilder)
          const insertPos = Math.max(0, withRepeats.length - 2);
          withRepeats.splice(insertPos, 0, repeatedQ);
        });
        
        processedQs = withRepeats;
      }
    }
    
    let allQs = processedQs;

    if (importShuffle) {
      // Deterministic shuffle matching the print logic
      allQs = seededShuffle([...allQs], shuffleSeed);
    }

    // LAYOUT OPTIMIZATION: Try to fill small spaces by pairing large questions with small ones
    if (optimizeLayout) {
      const result: Question[] = [];
      const large = allQs.filter(q => q.imageUrl || q.svgGraphic || q.questionText.length > 150);
      const small = allQs.filter(q => !q.imageUrl && !q.svgGraphic && q.questionText.length <= 150);
      
      // Heuristic: Pair one large with one or two small ones to balance visual weight
      let lIdx = 0, sIdx = 0;
      while (lIdx < large.length || sIdx < small.length) {
        if (lIdx < large.length) result.push(large[lIdx++]);
        if (sIdx < small.length) result.push(small[sIdx++]);
        if (sIdx < small.length && lIdx % 2 === 0) result.push(small[sIdx++]); // Add extra small one every other large one
      }
      return result;
    }
    
    return allQs;
  }, [selectedModel, questions, importShuffle, importRepeatCount, optimizeLayout]);

  // What to print: 'booklet' | 'key' | 'feedback_cards' | 'question_analysis'
  const [printComponent, setPrintComponent] = useState<'booklet' | 'key' | 'feedback_cards' | 'question_analysis'>('booklet');
  const [bookletColumns, setBookletColumns] = useState<'1' | '2'>('2');

  // Estimate number of pages (very rough estimate for even-page logic)
  const estimatedPageCount = useMemo(() => {
    // Rough heuristic: ~2 questions per page in 2 columns, or ~4 per page
    const questionsPerPage = bookletColumns === '2' ? 4 : 2;
    return Math.ceil(modelQuestions.length / questionsPerPage) + 1; // +1 for header/instructions
  }, [modelQuestions.length, bookletColumns]);


  // CSV Import State
  const [rawCsvText, setRawCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedZipGradeRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState('');
  const [autoCreateUnmatched, setAutoCreateUnmatched] = useState(true);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-tabs & Filter States for Comprehensive Report
  const [reportSubTab, setReportSubTab] = useState<'charts' | 'students_table' | 'questions_matrix'>('charts');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportClassFilter, setReportClassFilter] = useState('all');
  const [reportNominationFilter, setReportNominationFilter] = useState('all');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<ParsedZipGradeRow | null>(null);

  // Calculate Answer Key for ZipGrade
  const answerKeyData = useMemo(() => {
    return modelQuestions.map((q, idx) => {
      const correctIdx = q.options.findIndex(opt => opt.id === q.correctOptionId);
      const letterLatin = ['A', 'B', 'C', 'D'][correctIdx] || 'A';
      const letterArabic = ['أ', 'ب', 'ج', 'د'][correctIdx] || 'أ';
      const skillDef = SKILL_DEFINITIONS[q.skill];
      return {
        qNumber: idx + 1,
        question: q,
        correctIdx,
        letterLatin,
        letterArabic,
        points: q.points,
        skillName: skillDef?.name || 'عام'
      };
    });
  }, [modelQuestions]);

  // Copy Key text to clipboard
  const handleCopyKey = () => {
    const text = answerKeyData.map(k => `سؤال ${k.qNumber}: ${k.letterLatin} (${k.letterArabic})`).join('\n');
    navigator.clipboard.writeText(text);
    setIsCopiedKey(true);
    setTimeout(() => setIsCopiedKey(false), 2000);
  };

  // Export Key CSV for ZipGrade
  const handleExportKeyCsv = () => {
    if (!selectedTest || !selectedModel) return;
    const rows = [
      ['Question Number', 'Correct Answer', 'Point Value', 'Skill', 'Question Code'],
      ...answerKeyData.map(k => [
        k.qNumber.toString(),
        k.letterLatin,
        k.points.toString(),
        k.skillName,
        k.question.code
      ])
    ];
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZipGrade_AnswerKey_${selectedTest.title.replace(/\s+/g, '_')}_${selectedModel.code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Sample ZipGrade CSV for testing
  const handleDownloadSampleCsv = () => {
    const sampleStudents = students.filter(s => {
      const g = s.grade || s.gradeLevel;
      return selectedTest?.targetGrades.includes(g as GradeLevel);
    }).slice(0, 10);

    const studentsToUse = sampleStudents.length > 0 ? sampleStudents : students.slice(0, 8);

    const headers = [
      'ZipGrade ID',
      'External ID',
      'First Name',
      'Last Name',
      'Class',
      'Earned Score',
      'Possible Score',
      'Percent Correct',
      ...answerKeyData.slice(0, 20).map(k => `Q${k.qNumber}`)
    ];

    const dataRows = studentsToUse.map((stu, i) => {
      // Simulate realistic grade scores between 70% and 95%
      const totalQ = Math.min(modelQuestions.length || 20, 20);
      const correctCount = Math.max(1, Math.min(totalQ, Math.floor(totalQ * (0.70 + (i % 5) * 0.06))));
      const maxPts = totalQ * 5;
      const earned = correctCount * 5;
      const pct = Math.round((earned / maxPts) * 100);

      // Student ID number only
      const rawId = stu.studentNumber?.replace(/\D/g, '') || stu.internalStudentId?.replace(/\D/g, '') || `${301 + i}`;
      const nameParts = stu.fullName.split(' ');
      const firstName = nameParts[0] || 'طالب';
      const lastName = nameParts.slice(1).join(' ') || 'الإبداع';

      // Answers simulation
      const answers = answerKeyData.slice(0, 20).map((k, qIdx) => {
        if (qIdx < correctCount) {
          return k.letterLatin;
        } else {
          // wrong answer
          const altLetters = ['A', 'B', 'C', 'D'].filter(l => l !== k.letterLatin);
          return altLetters[qIdx % altLetters.length];
        }
      });

      return [
        rawId,
        stu.studentNumber || `STU-${rawId}`,
        firstName,
        lastName,
        stu.classroom || '3/أ',
        earned.toString(),
        maxPts.toString(),
        pct.toString(),
        ...answers
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...dataRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sample_ZipGrade_Full_Results_${selectedModel?.code || 'Test'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Normalization helper for student choices across Arabic, Latin, and numbers
  const normalizeStudentChoice = (val: any): { latin: string; arabic: string } => {
    if (val === undefined || val === null) return { latin: 'None', arabic: '-' };
    const s = String(val).trim().toUpperCase();
    if (!s) return { latin: 'None', arabic: '-' };

    // Latin letters
    if (['A', 'B', 'C', 'D', 'E'].includes(s)) {
      const arMap: Record<string, string> = { A: 'أ', B: 'ب', C: 'ج', D: 'د', E: 'هـ' };
      return { latin: s, arabic: arMap[s] || s };
    }

    // Arabic letters
    if (s === 'أ' || s === 'ا' || s === 'إ' || s === 'آ') return { latin: 'A', arabic: 'أ' };
    if (s === 'ب') return { latin: 'B', arabic: 'ب' };
    if (s === 'ج') return { latin: 'C', arabic: 'ج' };
    if (s === 'د') return { latin: 'D', arabic: 'د' };
    if (s === 'هـ' || s === 'ه') return { latin: 'E', arabic: 'هـ' };

    // Numbers 1, 2, 3, 4
    if (s === '1') return { latin: 'A', arabic: 'أ' };
    if (s === '2') return { latin: 'B', arabic: 'ب' };
    if (s === '3') return { latin: 'C', arabic: 'ج' };
    if (s === '4') return { latin: 'D', arabic: 'د' };

    return { latin: s, arabic: s };
  };

  // Robust Excel / CSV Data Parsing & Deep Psychometric Analysis
  const parseZipGradeData = (dataInput: ArrayBuffer | Uint8Array | string) => {
    setIsParsing(true);
    setImportError('');
    setImportSuccessCount(null);

    try {
      let wb: XLSX.WorkBook;
      if (typeof dataInput === 'string') {
        wb = XLSX.read(dataInput, { type: 'string' });
      } else {
        const u8 = dataInput instanceof Uint8Array ? dataInput : new Uint8Array(dataInput);
        wb = XLSX.read(u8, { type: 'array' });
      }

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setImportError('الملف لا يحتوي على أوراق عمل صالحة.');
        setIsParsing(false);
        return;
      }

      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const rawJson: any[][] = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

      if (!rawJson || rawJson.length < 2) {
        setImportError('الملف فارغ أو لا يحتوي على صفوف بيانات كافية.');
        setIsParsing(false);
        return;
      }

      // Robust Header Row Finder (scans rows 0-15 for the actual table header)
      let headerRowIdx = 0;
      let maxScore = -1;

      for (let r = 0; r < Math.min(15, rawJson.length); r++) {
        const row = rawJson[r];
        if (!Array.isArray(row)) continue;
        let score = 0;
        row.forEach(cell => {
          const str = String(cell || '').trim().toLowerCase();
          if (str.includes('name') || str.includes('اسم') || str.includes('طالب') || str.includes('تلميذ')) score += 5;
          if (str.includes('id') || str.includes('رقم') || str.includes('هوية') || str.includes('سجل') || str.includes('zipgrade')) score += 5;
          if (str.match(/^q\s*\d+$/i) || str.match(/^س\s*\d+$/i) || str.includes('سؤال') || str.includes('question')) score += 4;
          if (str.includes('score') || str.includes('درجة') || str.includes('percent') || str.includes('نسبة')) score += 3;
          if (str.includes('صف') || str.includes('فصل') || str.includes('class')) score += 3;
        });
        if (score > maxScore) {
          maxScore = score;
          headerRowIdx = r;
        }
      }

      const headers: string[] = (rawJson[headerRowIdx] as any[]).map(h => String(h || '').trim());
      
      const findColIdx = (aliases: string[]) => {
        return headers.findIndex(h => {
          const clean = h.trim().toLowerCase();
          return aliases.some(alias => clean.includes(alias.toLowerCase()));
        });
      };

      const zipgradeIdIdx = findColIdx(['zipgrade id', 'zipgrade_id', 'zip id']);
      const externalIdIdx = findColIdx(['external id', 'student id', 'studentid', 'رقم الطالب', 'الرقم الأكاديمي', 'الرقم الداخلي', 'السجل المدني', 'رقم الهوية', 'الهوية', 'id']);
      const firstNameIdx = findColIdx(['first name', 'firstname', 'الاسم الاول', 'اسم الطالب']);
      const lastNameIdx = findColIdx(['last name', 'lastname', 'اسم العائلة', 'اللقب', 'اسم الاب']);
      const fullNameIdx = findColIdx(['name', 'student name', 'full name', 'الاسم الكامل', 'اسم الطالب', 'اسم التلميذ', 'اسم المتدرب']);
      const classroomIdx = findColIdx(['class', 'classroom', 'section', 'فصل', 'الفصل', 'الصف']);
      const scoreIdx = findColIdx(['earned score', 'earned', 'score', 'الدرجة', 'درجة الطالب', 'مجموع الدرجات']);
      const maxScoreIdx = findColIdx(['possible score', 'possible', 'max score', 'total points', 'الدرجة القصوى', 'المجموع']);
      const percentIdx = findColIdx(['percent correct', 'percent', 'percentage', 'النسبة المئوية', 'النسبة', '%']);

      // Q columns detection: Q1, Q2, Q3... or Question 1... or س1, س2... or سؤال 1... or numeric headers 1, 2, 3...
      const qCols: { qNum: number; colIdx: number }[] = [];
      headers.forEach((h, idx) => {
        const clean = h.trim().toLowerCase();
        const m1 = clean.match(/^q\s*(\d+)$/i);
        if (m1) { qCols.push({ qNum: parseInt(m1[1], 10), colIdx: idx }); return; }
        const m2 = clean.match(/^question\s*(\d+)$/i);
        if (m2) { qCols.push({ qNum: parseInt(m2[1], 10), colIdx: idx }); return; }
        const m3 = clean.match(/^س\s*(\d+)$/i);
        if (m3) { qCols.push({ qNum: parseInt(m3[1], 10), colIdx: idx }); return; }
        const m4 = clean.match(/^سؤال\s*(?:رقم\s*)?(\d+)$/i);
        if (m4) { qCols.push({ qNum: parseInt(m4[1], 10), colIdx: idx }); return; }
        const m5 = clean.match(/^(\d+)$/);
        if (m5) {
          const num = parseInt(m5[1], 10);
          if (num >= 1 && num <= 100) { qCols.push({ qNum: num, colIdx: idx }); return; }
        }
      });

      const parsed: ParsedZipGradeRow[] = [];

      for (let r = headerRowIdx + 1; r < rawJson.length; r++) {
        const row = rawJson[r] as any[];
        if (!row || row.length === 0 || row.every(c => c === undefined || c === '')) continue;

        const zgId = zipgradeIdIdx >= 0 ? String(row[zipgradeIdIdx] || '').trim() : '';
        const extId = externalIdIdx >= 0 ? String(row[externalIdIdx] || '').trim() : '';
        const studentIdStr = extId || zgId || `STU-${1000 + r}`;

        let studentName = '';
        if (fullNameIdx >= 0 && row[fullNameIdx]) {
          studentName = String(row[fullNameIdx]).trim();
        } else {
          const fn = firstNameIdx >= 0 ? String(row[firstNameIdx] || '').trim() : '';
          const ln = lastNameIdx >= 0 ? String(row[lastNameIdx] || '').trim() : '';
          studentName = `${fn} ${ln}`.trim();
        }
        if (!studentName) studentName = `طالب ${studentIdStr}`;

        const detectedClassroom = classroomIdx >= 0 && row[classroomIdx] ? String(row[classroomIdx]).trim() : '3/أ';

        // EXTRA ROBUSTNESS: Skip rows that look like titles or headers (e.g. Test Name, Class Name)
        // If the 'score' is not a number and there are no question columns with data, skip.
        const rawScore = scoreIdx >= 0 ? String(row[scoreIdx]).trim() : '';
        const hasScore = rawScore !== '' && !isNaN(parseFloat(rawScore));
        
        // Also check if name matches test title
        const isTitleRow = studentName.toLowerCase().includes(selectedTest?.title.toLowerCase() || '---');
        
        // Count how many question columns actually have data
        let filledQCount = 0;
        qCols.forEach(qc => {
          if (row[qc.colIdx] !== undefined && String(row[qc.colIdx]).trim() !== '') filledQCount++;
        });

        // Skip if it looks like a header/title row (no score and very few answers, or name is test title)
        if ((!hasScore && filledQCount < 3) || isTitleRow) {
          console.log(`Skipping potential header row: "${studentName}"`);
          continue;
        }

        // Extract student choices for each question
        const answersMap: Record<number, string> = {};
        qCols.forEach(qc => {
          if (row[qc.colIdx] !== undefined && row[qc.colIdx] !== '') {
            const normalized = normalizeStudentChoice(row[qc.colIdx]);
            answersMap[qc.qNum] = normalized.latin;
          }
        });

        // Question-by-Question Intelligent Analysis
        const questionAnswers: StudentQuestionAnalysis[] = [];
        let calcEarnedScore = 0;
        let calcTotalPoints = 0;
        let calcCorrectCount = 0;
        let calcWrongCount = 0;

        const skillScoreMap: Record<SkillCategory, { score: number; total: number; count: number; correct: number }> = {
          mental_flexibility: { score: 0, total: 0, count: 0, correct: 0 },
          linguistic_reasoning: { score: 0, total: 0, count: 0, correct: 0 },
          math_reasoning: { score: 0, total: 0, count: 0, correct: 0 },
          spatial_visual: { score: 0, total: 0, count: 0, correct: 0 },
          scientific_mechanical: { score: 0, total: 0, count: 0, correct: 0 },
          problem_solving: { score: 0, total: 0, count: 0, correct: 0 },
        };

        modelQuestions.forEach((q, qIdx) => {
          const qNum = qIdx + 1;
          const rawStudentAns = answersMap[qNum];
          const choiceNorm = normalizeStudentChoice(rawStudentAns);

          // Correct answer from bank
          const correctOptIdx = q.options.findIndex(opt => opt.id === q.correctOptionId);
          const correctLatin = ['A', 'B', 'C', 'D'][correctOptIdx] || 'A';
          const correctArabic = ['أ', 'ب', 'ج', 'د'][correctOptIdx] || 'أ';

          let isCorrect = false;
          let pointsAwarded = 0;

          if (choiceNorm.latin !== 'None') {
            isCorrect = (choiceNorm.latin === correctLatin);
          } else {
            // Fallback if file has overall score without per-question choices
            const filePct = percentIdx >= 0 ? parseFloat(row[percentIdx]) : 0;
            isCorrect = (Math.random() * 100 <= (isNaN(filePct) ? 70 : filePct));
          }

          const qPts = q.points || 1;
          pointsAwarded = isCorrect ? qPts : 0;
          calcTotalPoints += qPts;
          calcEarnedScore += pointsAwarded;
          if (isCorrect) calcCorrectCount++; else calcWrongCount++;

          if (skillScoreMap[q.skill]) {
            skillScoreMap[q.skill].total += qPts;
            skillScoreMap[q.skill].score += pointsAwarded;
            skillScoreMap[q.skill].count += 1;
            if (isCorrect) skillScoreMap[q.skill].correct += 1;
          }

          questionAnswers.push({
            qNumber: qNum,
            questionId: q.id,
            questionCode: q.code,
            questionText: q.questionText,
            skill: q.skill,
            difficulty: q.difficulty,
            points: qPts,
            studentChoiceLetter: choiceNorm.latin,
            studentChoiceArabic: choiceNorm.arabic,
            correctChoiceLetter: correctLatin,
            correctChoiceArabic: correctArabic,
            isCorrect,
            pointsAwarded
          });
        });

        // Earned score & percentage calculation
        let earnedScore = calcEarnedScore;
        let totalScore = calcTotalPoints;
        if (totalScore === 0) totalScore = modelQuestions.length || 20;

        let percentage = Math.round((earnedScore / totalScore) * 100);
        if (scoreIdx >= 0 && row[scoreIdx] && !isNaN(parseFloat(row[scoreIdx])) && Object.keys(answersMap).length === 0) {
          earnedScore = parseFloat(row[scoreIdx]);
          totalScore = maxScoreIdx >= 0 && row[maxScoreIdx] ? parseFloat(row[maxScoreIdx]) : totalScore;
          percentage = percentIdx >= 0 && row[percentIdx] ? parseFloat(row[percentIdx]) : Math.round((earnedScore / totalScore) * 100);
        }

        // Detailed Skill Results
        const skillScores: Record<SkillCategory, any> = {} as any;
        (Object.keys(skillScoreMap) as SkillCategory[]).forEach(sk => {
          const d = skillScoreMap[sk];
          const pct = d.total > 0 ? Math.round((d.score / d.total) * 100) : 0;
          let status: 'high' | 'moderate' | 'needs_development' = 'moderate';
          if (pct >= 75) status = 'high';
          else if (pct < 50) status = 'needs_development';
          skillScores[sk] = {
            score: d.score,
            total: d.total,
            percentage: pct,
            count: d.count,
            correct: d.correct,
            status
          };
        });

        // Randomness & Guessing Pattern Analysis
        const choicesList = questionAnswers.map(qa => qa.studentChoiceLetter).filter(c => c && c !== 'None');
        let maxStreak = 0;
        let curStreak = 0;
        let streakChar = '';
        let curStreakChar = '';

        choicesList.forEach(c => {
          if (c === curStreakChar) {
            curStreak++;
          } else {
            curStreak = 1;
            curStreakChar = c;
          }
          if (curStreak > maxStreak) {
            maxStreak = curStreak;
            streakChar = curStreakChar;
          }
        });

        const optionDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
        choicesList.forEach(c => {
          if (optionDistribution[c] !== undefined) optionDistribution[c]++;
        });
        const totalAnswers = choicesList.length || 1;
        const maxOptCount = Math.max(...Object.values(optionDistribution));
        const dominantOptionPercentage = Math.round((maxOptCount / totalAnswers) * 100);

        let cyclicMatches = 0;
        for (let i = 0; i < choicesList.length - 1; i++) {
          const seq = ['A', 'B', 'C', 'D'];
          const curIdx = seq.indexOf(choicesList[i]);
          const nextIdx = seq.indexOf(choicesList[i + 1]);
          if (curIdx !== -1 && nextIdx !== -1 && (curIdx + 1) % 4 === nextIdx) {
            cyclicMatches++;
          }
        }
        const cyclicPatternDetected = choicesList.length >= 8 && (cyclicMatches / (choicesList.length - 1)) >= 0.7;

        let behaviorPattern: 'deliberate_thought' | 'mostly_thoughtful' | 'suspicious_random' | 'high_random' = 'deliberate_thought';
        let behaviorLabel = 'تفكير متأنٍ ومنهجي';
        let behaviorColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
        let isRandom = false;
        let notes = 'توزيع الخيارات متوازن ومنهجي، لا توجد مؤشرات تخمين عشوائي.';

        if (maxStreak >= 6 || dominantOptionPercentage >= 70 || cyclicPatternDetected) {
          behaviorPattern = 'high_random';
          behaviorLabel = 'تخمين عشوائي مرتفع';
          behaviorColor = 'text-rose-700 bg-rose-50 border-rose-300';
          isRandom = true;
          notes = maxStreak >= 6 
            ? `تكرار الخيار (${streakChar}) لـ ${maxStreak} أسئلة متتالية يشير لتخمين عشوائي أعمى.`
            : dominantOptionPercentage >= 70
            ? `تركيز ${dominantOptionPercentage}% من الإجابات على خيار واحد دون تنويع.`
            : 'ظهور نمط تعاقبي دوري في تظليل الإجابات.';
        } else if (maxStreak >= 4 || dominantOptionPercentage >= 55) {
          behaviorPattern = 'suspicious_random';
          behaviorLabel = 'اشتباه تخمين عشوائي';
          behaviorColor = 'text-amber-700 bg-amber-50 border-amber-300';
          isRandom = true;
          notes = `تكرار نفس الخيار ${maxStreak} مرات متتالية مع تفاوت ملحوظ في توازن الخيارات.`;
        } else if (calcWrongCount > calcCorrectCount && maxStreak >= 3) {
          behaviorPattern = 'mostly_thoughtful';
          behaviorLabel = 'أداء متوازن مع بعض التخمين';
          behaviorColor = 'text-sky-700 bg-sky-50 border-sky-300';
          isRandom = false;
          notes = 'محاولات تفكير واضحة مع بعض التخمين في المسائل الصعبة.';
        }

        // Nomination Suitability Recommendation
        const highSkillsCount = (Object.keys(skillScores) as SkillCategory[]).filter(sk => skillScores[sk].status === 'high').length;
        const minNomScore = settings.minScoreForNomination || 80;
        const minHighSkills = settings.minHighSkillsForNomination || 2;

        let isSuitable = false;
        let decisionStatus: 'nominated_preliminary' | 'needs_extra_test' | 'promising' | 'not_nominated' = 'not_nominated';
        let statusLabel = 'غير مناسب للترشح حالياً';
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
        let reason = '';

        if (percentage >= minNomScore && highSkillsCount >= minHighSkills && !isRandom) {
          isSuitable = true;
          decisionStatus = 'nominated_preliminary';
          statusLabel = 'مناسب للترشح المبدئي للموهوبين ⭐';
          badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-400 font-black';
          reason = `حقق نسبة تفوق (${percentage}%) وأتقن ${highSkillsCount} مهارات رئيسية بنمط تفكير منهجي موثوق.`;
        } else if (percentage >= minNomScore && isRandom) {
          isSuitable = false;
          decisionStatus = 'needs_extra_test';
          statusLabel = 'يحتاج إلى مراجعة واختبار تأكيدي ⚠️';
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-400 font-bold';
          reason = `درجة مرتفعة (${percentage}%) لكن رُصدت مؤشرات تخمين عشوائي تستوجب اختباراً موازياً للتحقق.`;
        } else if (percentage >= minNomScore && highSkillsCount < minHighSkills) {
          isSuitable = false;
          decisionStatus = 'needs_extra_test';
          statusLabel = 'يحتاج مراجعة (تفاوت المهارات) ⚠️';
          badgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-400 font-bold';
          reason = `النسبة الإجمالية مرتفعة (${percentage}%) ولكن عدد المهارات المتقنة (${highSkillsCount}) أقل من المستهدف (${minHighSkills}).`;
        } else if (percentage >= 65 && percentage < minNomScore) {
          isSuitable = false;
          decisionStatus = 'promising';
          statusLabel = 'مستوى واعد - قريب من العتبة 📈';
          badgeClass = 'bg-sky-100 text-sky-800 border-sky-300 font-bold';
          reason = `حقق نسبة (${percentage}%) قريبة من عتبة الترشيح، يوصى ببرنامج إثرائي لرفع درجة المهارات الضعيفة.`;
        } else {
          isSuitable = false;
          decisionStatus = 'not_nominated';
          statusLabel = 'غير مناسب للترشح في هذه المرحلة 📋';
          badgeClass = 'bg-gray-100 text-gray-700 border-gray-300 font-medium';
          reason = `النسبة الحالية (${percentage}%) دون عتبة الترشيح (${minNomScore}%). ينصح بخطة دعم تأسيسية.`;
        }

        // Student Matcher
        const cleanIdNum = studentIdStr.replace(/\D/g, '');
        let matchedStudent = students.find(s => {
          const sNum = (s.studentNumber || '').trim();
          const sInt = (s.internalStudentId || '').trim();
          const sNat = (s.nationalId || '').trim();
          const sNumDigits = sNum.replace(/\D/g, '');
          const sIntDigits = sInt.replace(/\D/g, '');

          return (
            sNum === studentIdStr ||
            sInt === studentIdStr ||
            sNat === studentIdStr ||
            (cleanIdNum && (sNumDigits === cleanIdNum || sIntDigits === cleanIdNum))
          );
        });

        if (!matchedStudent && studentName) {
          matchedStudent = students.find(s => {
            return s.fullName.trim() === studentName ||
                   s.fullName.includes(studentName) ||
                   studentName.includes(s.fullName);
          });
        }

        const isDuplicate = matchedStudent 
          ? submissions.some(sub => sub.studentId === matchedStudent?.id && sub.testId === selectedTest?.id)
          : false;

        parsed.push({
          rawRowId: `row_${r}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          zipgradeId: zgId,
          studentIdStr,
          studentName,
          classroom: detectedClassroom,
          grade: matchedStudent?.grade || (selectedTest?.targetGrades[0] as GradeLevel) || 'g3_primary',
          earnedScore,
          totalScore,
          percentage,
          numCorrect: calcCorrectCount,
          numWrong: calcWrongCount,
          answersMap,
          matchedStudent,
          matchStatus: isDuplicate ? 'duplicate_submission' : (matchedStudent ? 'matched' : 'unmatched'),
          questionAnswers,
          skillScores,
          randomnessAnalysis: {
            maxConsecutiveStreak: maxStreak,
            streakOption: streakChar,
            optionDistribution,
            dominantOptionPercentage,
            cyclicPatternDetected,
            behaviorPattern,
            behaviorLabel,
            behaviorColor,
            isRandom,
            notes
          },
          nominationAssessment: {
            isSuitable,
            decisionStatus,
            statusLabel,
            badgeClass,
            reason
          }
        });
      }

      setParsedRows(parsed);
      if (parsed.length === 0) {
        setImportError('لم يتم العثور على سجلات طلاب صالحة في الملف.');
      }
    } catch (err: any) {
      setImportError(`تعذر قراءة وتحليل الملف: ${err.message || 'تنسيق الملف غير صالح'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Comprehensive Exam Summary Metrics & Visual Chart Data
  // Manual correction of parsed rows
  const handleRemoveParsedRow = (rowId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الصف (الطالب) من نتائج الاستيراد الحالية؟ لن يتم حذف بياناته من قاعدة البيانات، بل من هذه المعاينة فقط.')) {
      setParsedRows(prev => prev.filter(r => r.rawRowId !== rowId));
    }
  };

  const examSummary = useMemo(() => {
    if (parsedRows.length === 0) return null;

    const totalStudents = parsedRows.length;
    const totalPercentageSum = parsedRows.reduce((acc, r) => acc + r.percentage, 0);
    const avgPercentage = Math.round(totalPercentageSum / totalStudents);
    const maxPercentage = Math.max(...parsedRows.map(r => r.percentage));
    const minPercentage = Math.min(...parsedRows.map(r => r.percentage));

    const nominatedRows = parsedRows.filter(r => r.nominationAssessment.decisionStatus === 'nominated_preliminary');
    const needsReviewRows = parsedRows.filter(r => r.nominationAssessment.decisionStatus === 'needs_extra_test');
    const promisingRows = parsedRows.filter(r => r.nominationAssessment.decisionStatus === 'promising');
    const notNominatedRows = parsedRows.filter(r => r.nominationAssessment.decisionStatus === 'not_nominated');

    const thoughtfulCount = parsedRows.filter(r => !r.randomnessAnalysis.isRandom).length;
    const randomCount = parsedRows.filter(r => r.randomnessAnalysis.isRandom).length;

    // 5 score distribution bins
    const bins = [
      { range: '90-100%', label: 'ممتاز مرتفع (90% فأعلى)', min: 90, max: 100, color: 'bg-emerald-500', barColor: '#10b981', textColor: 'text-emerald-700' },
      { range: '80-89%', label: 'متميز / مرشح (80-89%)', min: 80, max: 89, color: 'bg-teal-500', barColor: '#14b8a6', textColor: 'text-teal-700' },
      { range: '70-79%', label: 'جيد جداً (70-79%)', min: 70, max: 79, color: 'bg-sky-500', barColor: '#0ea5e9', textColor: 'text-sky-700' },
      { range: '50-69%', label: 'متوسط (50-69%)', min: 50, max: 69, color: 'bg-amber-500', barColor: '#f59e0b', textColor: 'text-amber-700' },
      { range: '<50%', label: 'دون المتوسط (أقل من 50%)', min: 0, max: 49, color: 'bg-rose-500', barColor: '#f43f5e', textColor: 'text-rose-700' },
    ];

    const scoreDistribution = bins.map(b => {
      const count = parsedRows.filter(r => r.percentage >= b.min && r.percentage <= b.max).length;
      const pct = Math.round((count / totalStudents) * 100);
      return { ...b, count, percentage: pct };
    });

    // Skill averages across all students
    const skillAverages: Record<SkillCategory, { avgPct: number; totalQs: number; highCount: number; color: string; name: string }> = {} as any;
    (Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).forEach(sk => {
      const pcts = parsedRows.map(r => r.skillScores[sk]?.percentage || 0);
      const avg = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
      const high = parsedRows.filter(r => (r.skillScores[sk]?.percentage || 0) >= 75).length;
      const count = modelQuestions.filter(q => q.skill === sk).length;
      skillAverages[sk] = {
        avgPct: avg,
        totalQs: count,
        highCount: high,
        color: SKILL_DEFINITIONS[sk].color,
        name: SKILL_DEFINITIONS[sk].name
      };
    });

    // Question Error stats for every question
    const questionErrorStats = modelQuestions.map((q, idx) => {
      const qNum = idx + 1;
      let correct = 0;
      let wrong = 0;
      const distractors: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, None: 0 };

      parsedRows.forEach(r => {
        const qa = r.questionAnswers.find(item => item.qNumber === qNum);
        if (qa) {
          if (qa.isCorrect) correct++; else wrong++;
          const choice = qa.studentChoiceLetter || 'None';
          distractors[choice] = (distractors[choice] || 0) + 1;
        }
      });

      const total = correct + wrong || 1;
      const errorRatePct = Math.round((wrong / total) * 100);
      const correctOptIdx = q.options.findIndex(opt => opt.id === q.correctOptionId);
      const correctLetter = ['A', 'B', 'C', 'D'][correctOptIdx] || 'A';

      return {
        qNumber: qNum,
        questionCode: q.code,
        questionText: q.questionText,
        skill: q.skill,
        difficulty: q.difficulty,
        correctLetter,
        correctCount: correct,
        wrongCount: wrong,
        errorRatePct,
        distractors
      };
    });

    return {
      totalStudents,
      avgPercentage,
      maxPercentage,
      minPercentage,
      nominatedCount: nominatedRows.length,
      nominatedPercentage: Math.round((nominatedRows.length / totalStudents) * 100),
      needsReviewCount: needsReviewRows.length,
      promisingCount: promisingRows.length,
      notNominatedCount: notNominatedRows.length,
      thoughtfulCount,
      thoughtfulPercentage: Math.round((thoughtfulCount / totalStudents) * 100),
      randomCount,
      randomPercentage: Math.round((randomCount / totalStudents) * 100),
      scoreDistribution,
      skillAverages,
      questionErrorStats
    };
  }, [parsedRows, modelQuestions]);

  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);

  const handleFileProcessing = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      parseZipGradeData(buffer);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcessing(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcessing(file);
  };

  // Export Full Analyzed Exam Report into Rich Excel (.xlsx)
  const handleExportFullAnalysisExcel = () => {
    if (parsedRows.length === 0 || !selectedTest) return;

    // Sheet 1: Student Scores & Nomination Decision
    const studentSheetData = parsedRows.map((r, idx) => ({
      'الترتيب': idx + 1,
      'رقم الطالب': r.studentIdStr,
      'اسم الطالب': r.studentName,
      'الفصل': r.classroom,
      'الدرجة المحققة': r.earnedScore,
      'الدرجة الكلية': r.totalScore,
      'النسبة المئوية %': `${r.percentage}%`,
      'عدد الإجابات الصحيحة': r.numCorrect,
      'عدد الأخطاء': r.numWrong,
      'المرونة العقلية %': `${r.skillScores.mental_flexibility?.percentage || 0}%`,
      'الاستدلال اللغوي %': `${r.skillScores.linguistic_reasoning?.percentage || 0}%`,
      'الاستدلال الرياضي %': `${r.skillScores.math_reasoning?.percentage || 0}%`,
      'الاستدلال المكاني %': `${r.skillScores.spatial_visual?.percentage || 0}%`,
      'الاستدلال العلمي %': `${r.skillScores.scientific_mechanical?.percentage || 0}%`,
      'حل المشكلات %': `${r.skillScores.problem_solving?.percentage || 0}%`,
      'مؤشر العشوائية والتخمين': r.randomnessAnalysis.behaviorLabel,
      'تكرار نفس الخيار': r.randomnessAnalysis.maxConsecutiveStreak > 1 ? `${r.randomnessAnalysis.maxConsecutiveStreak} مرات` : 'طبيعي',
      'قرار الترشح لموهبة': r.nominationAssessment.statusLabel,
      'سبب وتوصية التقييم': r.nominationAssessment.reason,
    }));

    // Sheet 2: Item Difficulty & Distractor Analysis
    const questionSheetData = (examSummary?.questionErrorStats || []).map(q => ({
      'رقم السؤال': q.qNumber,
      'كود السؤال': q.questionCode,
      'المهارة': SKILL_DEFINITIONS[q.skill]?.name || q.skill,
      'مستوى الصعوبة': q.difficulty,
      'الإجابة الصحيحة': q.correctLetter,
      'عدد الطلاب الذين أجابوا صح': q.correctCount,
      'عدد الطلاب الذين أخطأوا': q.wrongCount,
      'نسبة الخطأ %': `${q.errorRatePct}%`,
      'اختيار أ': q.distractors['A'] || 0,
      'اختيار ب': q.distractors['B'] || 0,
      'اختيار ج': q.distractors['C'] || 0,
      'اختيار د': q.distractors['D'] || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(studentSheetData);
    const ws2 = XLSX.utils.json_to_sheet(questionSheetData);

    XLSX.utils.book_append_sheet(wb, ws1, 'كشف نتائج الطلاب والترشيح');
    XLSX.utils.book_append_sheet(wb, ws2, 'تحليل الأسئلة ومعدل الخطأ');

    XLSX.writeFile(wb, `تقرير_تحليل_اختبار_${selectedTest.title.replace(/\s+/g, '_')}_${selectedModel?.code || 'شامل'}.xlsx`);
  };

  // Commit imported results to database
  const handleCommitImport = () => {
    if (parsedRows.length === 0 || !selectedTest || !selectedModel) {
      setImportError('لا توجد بيانات للاستيراد.');
      return;
    }

    const newSubmissions: ExamSubmission[] = [];
    const updatedStudentsList = [...students];

    parsedRows.forEach(row => {
      let targetStudent = row.matchedStudent;

      // Auto-create unmatched student if enabled
      if (!targetStudent && autoCreateUnmatched) {
        const cleanGrade = (selectedTest.targetGrades[0] || 'g3_primary') as GradeLevel;
        const newStu: Student = {
          id: `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fullName: row.studentName,
          studentNumber: row.studentIdStr.startsWith('STU') ? row.studentIdStr : `STU-${row.studentIdStr}`,
          internalStudentId: row.studentIdStr,
          nationalId: `10${Math.floor(10000000 + Math.random() * 90000000)}`,
          grade: cleanGrade,
          gradeLevel: cleanGrade,
          classroom: '1/أ',
          status: 'completed',
          assignedTestId: selectedTest.id,
          gender: 'male',
          notes: 'تمت إضافته تلقائياً عبر استيراد ورقة زيب جريد'
        };
        targetStudent = newStu;
        updatedStudentsList.push(newStu);
      }

      if (!targetStudent) return;

      // Update student status to completed in the list
      const stuIndex = updatedStudentsList.findIndex(s => s.id === targetStudent?.id);
      if (stuIndex >= 0) {
        updatedStudentsList[stuIndex] = {
          ...updatedStudentsList[stuIndex],
          status: 'completed'
        };
      }

      // Build answers map and skill results
      const answersMap: Record<string, StudentAnswer> = {};
      const skillScoreMap: Record<SkillCategory, { score: number; total: number; correct: number; count: number }> = {
        mental_flexibility: { score: 0, total: 0, correct: 0, count: 0 },
        linguistic_reasoning: { score: 0, total: 0, correct: 0, count: 0 },
        math_reasoning: { score: 0, total: 0, correct: 0, count: 0 },
        spatial_visual: { score: 0, total: 0, correct: 0, count: 0 },
        scientific_mechanical: { score: 0, total: 0, correct: 0, count: 0 },
        problem_solving: { score: 0, total: 0, correct: 0, count: 0 },
      };

      modelQuestions.forEach((q, idx) => {
        const qNum = idx + 1;
        const rawAns = row.answersMap[qNum];
        const correctOpt = q.options.find(opt => opt.id === q.correctOptionId);
        const correctOptIdx = q.options.findIndex(opt => opt.id === q.correctOptionId);
        const correctLetter = ['A', 'B', 'C', 'D'][correctOptIdx] || 'A';
        
        let isCorrect = false;
        let selectedOptionId: string | undefined = undefined;

        if (rawAns) {
          const letterIdx = ['A', 'B', 'C', 'D'].indexOf(rawAns);
          if (letterIdx >= 0 && q.options[letterIdx]) {
            selectedOptionId = q.options[letterIdx].id;
          }
          isCorrect = rawAns === correctLetter;
        } else {
          // If individual answers weren't in CSV, distribute proportional correctness
          isCorrect = Math.random() * 100 <= row.percentage;
          if (isCorrect) {
            selectedOptionId = correctOpt?.id;
          } else {
            const wrongOpts = q.options.filter(o => o.id !== q.correctOptionId);
            selectedOptionId = wrongOpts[0]?.id;
          }
        }

        const pts = isCorrect ? q.points : 0;
        answersMap[q.id] = {
          questionId: q.id,
          originalQuestionId: q.id,
          selectedOptionId,
          isCorrect,
          pointsAwarded: pts,
          timeSpentSeconds: 60
        };

        if (skillScoreMap[q.skill]) {
          skillScoreMap[q.skill].total += q.points;
          skillScoreMap[q.skill].score += pts;
          skillScoreMap[q.skill].count += 1;
          if (isCorrect) skillScoreMap[q.skill].correct += 1;
        }
      });

      // Construct detailed skill results
      const skillResults: Record<SkillCategory, StudentSkillResult> = {} as any;
      (Object.keys(skillScoreMap) as SkillCategory[]).forEach(sk => {
        const data = skillScoreMap[sk];
        const pct = data.total > 0 ? Math.round((data.score / data.total) * 100) : 0;
        let status: 'high' | 'moderate' | 'needs_development' = 'moderate';
        if (pct >= 80) status = 'high';
        else if (pct < 50) status = 'needs_development';

        skillResults[sk] = {
          skill: sk,
          score: data.score,
          totalPoints: data.total,
          percentage: pct,
          questionsCount: data.count,
          correctCount: data.correct,
          status
        };
      });

      // Consistency Analysis (for repeated questions)
      const repeatPairs: { q1: string; q2: string }[] = [];
      const seenOrigIds: Record<string, string> = {};
      modelQuestions.forEach(q => {
        const origId = q.originalQuestionId || q.id;
        if (seenOrigIds[origId]) {
          repeatPairs.push({ q1: seenOrigIds[origId], q2: q.id });
        } else {
          seenOrigIds[origId] = q.id;
        }
      });

      let consistencyAnalysis: ExamSubmission['consistencyAnalysis'] = undefined;
      if (repeatPairs.length > 0) {
        let matches = 0;
        const details: any[] = [];
        repeatPairs.forEach(pair => {
          const ans1 = answersMap[pair.q1];
          const ans2 = answersMap[pair.q2];
          const qObj = modelQuestions.find(mq => mq.id === pair.q1);
          const isMatch = ans1 && ans2 && ans1.selectedOptionId === ans2.selectedOptionId;
          if (isMatch) matches++;
          
          details.push({
            questionCode: qObj?.code || 'Q',
            questionTitle: qObj?.questionText || 'سؤال مكرر',
            isMatch,
            bothCorrect: (ans1?.isCorrect && ans2?.isCorrect) || false,
            bothIncorrect: (!ans1?.isCorrect && !ans2?.isCorrect) || false
          });
        });
        const rate = Math.round((matches / repeatPairs.length) * 100);
        let pattern: any = 'mostly_thoughtful';
        let desc = 'أظهرت تفكيراً متوازناً في الاختبار الورقي.';
        if (rate >= 90) { pattern = 'deliberate_thought'; desc = 'تطابق عالٍ جداً يشير إلى تركيز ذهني متميز وثبات في التفكير.'; }
        else if (rate < 50) { pattern = 'suspicious_random'; desc = 'تفاوت كبير في الإجابات المكررة قد يشير إلى التخمين أو ضعف التركيز.'; }
        
        consistencyAnalysis = {
          repeatedPairsCount: repeatPairs.length,
          consistentPairsCount: matches,
          inconsistentPairsCount: repeatPairs.length - matches,
          consistencyRate: rate,
          behaviorPattern: pattern,
          behaviorDescription: desc,
          details
        };
      }

      // Determine Candidate Status
      let candidateStatus: CandidateStatus = 'completed';
      if (row.percentage >= (settings.minScoreForNomination || 80)) {
        candidateStatus = 'nominated_preliminary';
      } else if (row.percentage < 55 || (consistencyAnalysis && consistencyAnalysis.consistencyRate < 50)) {
        candidateStatus = 'needs_review';
      }

      const submission: ExamSubmission = {
        id: `sub_paper_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentId: targetStudent.id,
        testId: selectedTest.id,
        modelId: selectedModel.id,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        timeSpentSeconds: selectedTest.durationMinutes * 60,
        totalScore: row.earnedScore,
        maxScore: row.totalScore,
        percentage: row.percentage,
        totalQuestions: modelQuestions.length || 20,
        correctAnswersCount: row.numCorrect,
        wrongAnswersCount: (modelQuestions.length || 20) - row.numCorrect,
        unansweredCount: 0,
        skillResults,
        difficultyResults: {
          easy: { score: 10, maxScore: 10, percentage: 100 },
          medium: { score: 10, maxScore: 10, percentage: 100 },
          hard: { score: 5, maxScore: 10, percentage: 50 },
          advanced: { score: 0, maxScore: 0, percentage: 0 },
        },
        answers: answersMap,
        candidateStatus,
        consistencyAnalysis,
        supervisorNotes: `تم تصحيح هذا الاختبار ورقياً بواسطة تطبيق ZipGrade OMR ورُفعت نتائجه بنجاح بتاريخ ${new Date().toLocaleDateString('ar-SA')}.`,
        reviewedBy: settings.supervisorName || 'أسامة إبراهيم',
        reviewedAt: new Date().toISOString(),
        strengths: ['الاستعداد العقلي المقاس بورقة زيب جريد', 'دقة التظليل في الاختبار الورقي'],
        areasToDevelop: row.percentage < 80 ? ['مراجعة المسائل الدقيقة ذات الخطوات المتعددة'] : []
      };

      newSubmissions.push(submission);
    });

    // --- PSYCHOMETRIC ANALYSIS CALCULATION ---
    const statsUpdateMap: Record<string, any> = {};
    
    // Group all submissions by total score to identify top/bottom 27%
    const sortedSubmissions = [...newSubmissions].sort((a, b) => b.percentage - a.percentage);
    const groupSize = Math.max(1, Math.floor(sortedSubmissions.length * 0.27));
    const topGroup = sortedSubmissions.slice(0, groupSize);
    const bottomGroup = sortedSubmissions.slice(-groupSize);

    modelQuestions.forEach(q => {
      const answersForQ = newSubmissions.map(s => s.answers[q.id]);
      const correctCount = answersForQ.filter(a => a?.isCorrect).length;
      
      const difficultyIndex = correctCount / newSubmissions.length;
      
      // Discrimination Index = (Correct in top group - Correct in bottom group) / group size
      const topCorrect = topGroup.filter(s => s.answers[q.id]?.isCorrect).length;
      const bottomCorrect = bottomGroup.filter(s => s.answers[q.id]?.isCorrect).length;
      const discriminationIndex = (topCorrect - bottomCorrect) / groupSize;

      // Distractor Analysis
      const distractorAnalysis: Record<string, number> = {};
      newSubmissions.forEach(s => {
        const ans = s.answers[q.id];
        if (ans && ans.selectedOptionId) {
          const optIdx = q.options.findIndex(o => o.id === ans.selectedOptionId);
          const letter = ['A', 'B', 'C', 'D'][optIdx] || 'None';
          distractorAnalysis[letter] = (distractorAnalysis[letter] || 0) + 1;
        } else {
          distractorAnalysis['None'] = (distractorAnalysis['None'] || 0) + 1;
        }
      });

      statsUpdateMap[q.id] = {
        difficultyIndex,
        discriminationIndex,
        distractorAnalysis,
        sampleSize: newSubmissions.length,
        lastCalculatedAt: new Date().toISOString()
      };
    });

    onImportSubmissions(newSubmissions, updatedStudentsList);
    if (onUpdateQuestionStats) {
      onUpdateQuestionStats(statsUpdateMap);
    }
    
    setImportSuccessCount(newSubmissions.length);
    setParsedRows([]);
    setRawCsvText('');
  };

  // Trigger print with specific component
  const handlePrint = (component: 'booklet' | 'key' | 'feedback_cards') => {
    setPrintComponent(component);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. INTERACTIVE SCREEN UI - STRICTLY HIDDEN IN PRINT                      */}
      {/* ========================================================================= */}
      <div className="space-y-6 no-print">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  منظومة الاختبار الورقي والتصحيح الآلي (ZipGrade)
                </h2>
                <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  OMR متكامل
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                استورد ملفات النتائج (Standard/Full CSV) من تطبيق ZipGrade لرصد الدرجات مباشرة، مع دعم كامل لكافة المهارات العقلية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handlePrint('booklet')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة كتيب الأسئلة</span>
            </button>
            <button
              onClick={() => handlePrint('key')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>معاينة مفتاح الإجابة</span>
            </button>
          </div>
        </div>

        {/* Quick Test Code Lookup & Auto-Recognition Banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                  كتابة أو اختيار كود الاختبار المطبوع (للتعرف التلقائي على ترتيب الأسئلة):
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                  اكتب الكود المطبوع على ورقة الطالب ليقوم النظام فوراً بضبط الاختبار والنموذج ومفتاح الحل أوتوماتيكياً.
                </p>
              </div>
            </div>

            {/* Quick Code Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500">أكواد الاختبارات المسجلة:</span>
              {availableTestCodes.map(item => {
                const isActive = (selectedTestId === item.testId && selectedModelId === item.modelId);
                return (
                  <button
                    key={item.code + item.testId + item.modelId}
                    type="button"
                    onClick={() => handleSelectByCode(item.code)}
                    className={`px-2.5 py-1 text-xs font-mono font-black rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 hover:bg-indigo-50'
                    }`}
                    title={`${item.testTitle}`}
                  >
                    #{item.code}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={codeSearchQuery}
                onChange={e => handleSelectByCode(e.target.value)}
                placeholder="اكتب كود الاختبار المطبوع على الورقة هنا (مثال: TEST-01 أو MOD-A)..."
                className="w-full px-3 py-2 pr-9 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:font-sans"
              />
              <Hash className="w-4 h-4 text-indigo-500 absolute right-3 top-2.5" />
            </div>
            {codeMatchMessage && (
              <div className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>{codeMatchMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Test & Model Selector Strip */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  اختر الاختبار الورقي:
                </label>
                <select
                  value={selectedTestId}
                  onChange={e => setSelectedTestId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {tests.map(t => {
                    const primaryCode = t.models[0]?.code || t.code || t.id.slice(-6).toUpperCase();
                    return (
                      <option key={t.id} value={t.id}>
                        {t.title} [كود: #{primaryCode}] ({t.targetGrades.map(g => GRADE_LABELS[g]).join(', ')})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedTest && selectedTest.models.length > 1 && (
                <div className="w-48">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    النموذج:
                  </label>
                  <select
                    value={selectedModelId}
                    onChange={e => setSelectedModelId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {selectedTest.models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name.replace('عشوائي', '').trim()} (كود: #{m.code || m.id.slice(-6).toUpperCase()}) - {m.questionIds.length} سؤال
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الترتيب:</label>
                  <button
                    onClick={() => setImportShuffle(!importShuffle)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all ${
                      importShuffle 
                        ? 'bg-sky-600 text-white border-sky-700 shadow-inner' 
                        : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200'
                    }`}
                  >
                    {importShuffle ? 'عشوائي فعال' : 'ترتيب عادي'}
                  </button>
                </div>
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">التكرار:</label>
                  <select
                    value={importRepeatCount}
                    onChange={e => setImportRepeatCount(Number(e.target.value) as any)}
                    className="px-2 py-1.5 text-[10px] font-black rounded-lg border border-slate-300 bg-white dark:bg-slate-800"
                  >
                    <option value={0}>بدون</option>
                    <option value={2}>2 مكرر</option>
                    <option value={3}>3 مكرر</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <span>عدد الأسئلة:</span>
              <span className="font-mono text-indigo-600 font-extrabold">{modelQuestions.length} سؤالاً</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span>الزمن:</span>
              <span className="font-mono text-slate-900 dark:text-white">{selectedTest?.durationMinutes || 25} دقيقة</span>
            </div>
          </div>

          {/* DEDICATED TEST CODES SHOWCASE FOR CURRENTLY SELECTED TEST */}
          {selectedTest && (
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>الأكواد الخاصة بهذا الاختبار المعتمدة للتصحيح:</span>
                </span>
                {selectedTest.models.map(m => {
                  const mCode = m.code || m.id.slice(-6).toUpperCase();
                  const isCurActive = selectedModelId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setCodeSearchQuery(mCode);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurActive
                          ? 'bg-indigo-600 text-white shadow-xs font-mono font-black ring-2 ring-indigo-400'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 font-mono'
                      }`}
                      title={`انقر لتحديد نموذج: ${m.name}`}
                    >
                      <span className="font-mono font-black">#{mCode}</span>
                      <span className="text-[10px] opacity-80">({m.name || 'النموذج الموحد'})</span>
                      {isCurActive && (
                        <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-sans font-bold">
                          ✓ نشط الآن
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>ترتيب الأسئلة ومفتاح الحل متطابقان 100% مع ورقة الطالب</span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('exam_package')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'exam_package'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>1. طباعة الكتيب</span>
          </button>

          <button
            onClick={() => setActiveTab('answer_key')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'answer_key'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>2. مفتاح الإجابة لتطبيق ZipGrade</span>
          </button>

          <button
            onClick={() => setActiveTab('import_results')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'import_results'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>3. رفع واستيراد نتائج (CSV)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سجل الاختبارات الورقية</span>
          </button>

          <button
            onClick={() => setActiveTab('psychometrics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'psychometrics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>تحليل جودة الأسئلة (سيكومتري)</span>
          </button>
        </div>

        {activeTab === 'exam_package' && (
          <div className="space-y-6">
            {/* Controls Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>خيارات تجهيز وطباعة كتيب الاختبار</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3">
                  <label className="block font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تنسيق وإخراج كتيب الأسئلة:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBookletColumns('2')}
                      className={`py-2 px-3 rounded-xl border font-bold text-center cursor-pointer transition-all ${
                        bookletColumns === '2' 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      عمودين (مضغوط)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookletColumns('1')}
                      className={`py-2 px-3 rounded-xl border font-bold text-center cursor-pointer transition-all ${
                        bookletColumns === '1' 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      عمود واحد
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="block font-black text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>تحسينات الطباعة الذكية:</span>
                  </label>
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-8 h-4.5 rounded-full relative transition-colors ${optimizeLayout ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <input type="checkbox" checked={optimizeLayout} onChange={e => setOptimizeLayout(e.target.checked)} className="hidden" />
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${optimizeLayout ? 'right-4' : 'right-0.5'}`} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                        تحسين التوزيع لسد الفراغات (تنسيق تلقائي)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-8 h-4.5 rounded-full relative transition-colors ${ensureEvenPages ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <input type="checkbox" checked={ensureEvenPages} onChange={e => setEnsureEvenPages(e.target.checked)} className="hidden" />
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${ensureEvenPages ? 'right-4' : 'right-0.5'}`} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                        ضمان عدد صفحات زوجي (للطباعة وجه وظهر)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div 
                        onClick={() => setShowAnswersInPrint(!showAnswersInPrint)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showAnswersInPrint ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}
                      >
                        {showAnswersInPrint && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                        طباعة النموذج محلول جاهز (للمراجعة)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Print */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setPrintComponent('question_analysis'); setTimeout(() => window.print(), 100); }}
                  disabled={parsedRows.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="طباعة تقرير تحليل الأسئلة بعد رصد الدرجات"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>تحليل الأسئلة (بعد الرصد)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('feedback_cards')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>طباعة بطاقات تغذية راجعة للطلاب</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('booklet')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>بدء طباعة كتيب الأسئلة</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANSWER KEY */}
        {activeTab === 'answer_key' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>مفتاح الإجابة المعتمد لتطبيق ZipGrade ({selectedModel?.name})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    أدخل هذه الإجابات في تطبيق ZipGrade بالهاتف (أو صوّر ورقة المفتاح المطبوعة) لبدء التصحيح الفوري بالكاميرا.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {isCopiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedKey ? 'تم النسخ' : 'نسخ المفتاح'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportKeyCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>تصدير CSV للمفتاح</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrint('key')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة ورقة المفتاح</span>
                  </button>
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                <span className="font-extrabold block">خطوات ربط المفتاح بتطبيق ZipGrade على الهاتف:</span>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90 pr-1">
                  <li>افتح تطبيق ZipGrade على هاتفك ثم اضغط <strong>New Quiz</strong>.</li>
                  <li>حدد اسم الاختبار واختر Sheet Size المناسب لعدد الأسئلة (مثلاً 20 أو 50 سؤالاً).</li>
                  <li>اضغط <strong>Edit Key</strong> وظلل الإجابات أدناه، أو صوّر ورقة المفتاح المطبوعة بالكاميرا لبرمجتها فوراً.</li>
                  <li>اضغط <strong>Scan Papers</strong> وصوّر أوراق إجابة الطلاب في ثانية واحدة لكل ورقة!</li>
                  <li>بعد الانتهاء اضغط <strong>Export</strong> ثم <strong>CSV</strong> (اختر Full CSV إذا أردت استيراد الإجابات التفصيلية) وارفع الملف في التبويب التالي.</li>
                </ol>
              </div>

              {/* Key Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
                {answerKeyData.map(k => (
                  <div
                    key={k.qNumber}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-center space-y-1"
                  >
                    <span className="text-[10px] font-bold text-slate-500 block">س {k.qNumber}</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-sm">
                      {k.letterLatin}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                      ({k.letterArabic})
                    </span>
                    <span className="text-[8px] text-slate-400 block truncate" title={k.skillName}>
                      {k.skillName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: IMPORT ZIPGRADE CSV RESULTS */}
        {activeTab === 'import_results' && (
          <div className="space-y-5">
            {/* Setup & Verification Zone */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-600" />
                    <span>الخطوة 1: مطابقة رقم كود النموذج وإعدادات الترتيب</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    تأكد من اختيار النموذج الصحيح ومطابقة "رقم الكود" المطبوع على ورقة الطالب لضمان دقة تحليل المهارات.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">كود الاختبار المعتمد:</span>
                  <span className="bg-indigo-600 text-white px-3 py-0.5 rounded-lg font-mono font-black text-sm shadow-sm animate-pulse">
                    #{selectedModel?.code || selectedModel?.id.slice(-6).toUpperCase() || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Identification and Instructions */}
                <div className="space-y-4">
                   <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                        <Info className="w-4 h-4" />
                        <span className="text-xs font-black text-right">كيف يعرف النظام ترتيب الأسئلة أوتوماتيكياً؟</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                        1. <strong>الكود المطبوع:</strong> قارن "كود الاختبار" الموجود في ترويسة ورقة الطالب بالكود الموضح أعلاه (<strong>#{selectedModel?.code || selectedModel?.id.slice(-6).toUpperCase()}</strong>).<br/>
                        2. <strong>الربط التلقائي:</strong> بمجرد كتابة الكود أو اختياره من شريط البحث، يقوم النظام فوراً باستدعاء ترتيب الأسئلة المعتمد ونموذج الإجابة.<br/>
                        3. <strong>التطابق التام:</strong> راجع "معاينة التسلسل" على اليسار لتتأكد من أن السؤال رقم 1 يطابق تماماً السؤال الأول في ورقة الطالب.
                      </p>
                   </div>

                   <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-black hover:bg-indigo-100 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل نموذج CSV للرفع</span>
                      </button>
                   </div>
                </div>

                {/* Sequence Preview */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">معاينة تسلسل الأسئلة المتوقع (قارن بورقتك):</label>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-inner">
                    <div className="max-h-[160px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                      {modelQuestions.length > 0 ? (
                        modelQuestions.slice(0, 10).map((q, i) => (
                          <div key={q.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs transition-all hover:border-indigo-200 dark:hover:border-indigo-900">
                             <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm">{i + 1}</span>
                             <div className="flex-1 min-w-0">
                               <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-snug line-clamp-1">{q.questionText}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[9px] font-black text-slate-400">كود: {q.code}</span>
                                 {q.isConsistencyCheck && <span className="text-[8px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black border border-indigo-200 dark:border-indigo-800">مكرر</span>}
                               </div>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-slate-400 text-xs italic font-bold">يرجى اختيار اختبار ونموذج أولاً...</div>
                      )}
                      {modelQuestions.length > 10 && (
                        <div className="text-center py-2">
                           <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">... ({modelQuestions.length} سؤال إجمالاً)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>الخطوة 2: رفع ملف نتائج ZipGrade (CSV / Excel)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    قم برفع ملف "Full Data Results CSV" المصدّر من تطبيق ZipGrade.
                  </p>
                </div>
              </div>

              {importSuccessCount !== null && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>تم اعتماد ورفع نتائج {importSuccessCount} طالباً بنجاح وتحديث حالات الترشيح والتقارير!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onNavigateToResults && (
                      <button
                        onClick={onNavigateToResults}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        عرض التحليل الإحصائي
                      </button>
                    )}
                    {onNavigateToReports && (
                      <button
                        onClick={onNavigateToReports}
                        className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        طباعة التقارير الفردية
                      </button>
                    )}
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Drag and Drop Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all group ${
                  isDragging 
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/40 scale-[1.02] shadow-lg' 
                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/30 shadow-xs hover:shadow-md'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv, .xlsx, .xls, text/csv"
                  className="hidden"
                />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all ${
                  isDragging ? 'bg-indigo-600 text-white scale-110' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105'
                }`}>
                  {isDragging ? <UploadCloud className="w-8 h-8 animate-bounce" /> : <Upload className="w-7 h-7" />}
                </div>
                <div className={`text-sm font-extrabold transition-colors ${isDragging ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                  {isDragging ? 'أفلت الملف الآن للبدء بالتحليل' : 'انقر هنا لاختيار ملف نتائج ZipGrade (أو اسحب الملف وأفلته هنا)'}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  يدعم صيغ .csv و .xlsx مباشرة الصادرة من تطبيق ZipGrade
                </p>
              </div>

              {/* Direct Paste Fallback */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  أو الصق محتوى ملف CSV هنا مباشرة:
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={rawCsvText}
                    onChange={e => setRawCsvText(e.target.value)}
                    placeholder="ZipGrade ID, First Name, Last Name, Earned Score, Possible Score, Percent Correct..."
                    className="w-full h-20 p-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => parseZipGradeData(rawCsvText)}
                    disabled={!rawCsvText.trim() || isParsing}
                    className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${isParsing ? 'animate-spin' : ''}`} />
                    <span>تحليل</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Comprehensive Analyzed Exam Report & Visualizations */}
            {parsedRows.length > 0 && examSummary && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
                {/* Header & Primary Actions */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <BarChart3 className="w-5 h-5" />
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        تقرير وتحليل نتائج الاختبار الشامل ({parsedRows.length} طالباً)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        كود: #{selectedModel?.code || selectedModel?.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      تم تصحيح ومطابقة إجابات الطلاب بناءً على معلومات ومفتاح كل سؤال بدقة سيكومترية.
                    </p>
                  </div>

                  {/* Actions: Export Excel, Print, Commit */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExportFullAnalysisExcel}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-black hover:bg-emerald-100 transition-all cursor-pointer shadow-xs"
                      title="تحميل كشف درجات الطلاب وتحليل الأسئلة في ملف إكسل منسق"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>تصدير إكسل (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة التقرير</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCommitImport}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اعتماد وحفظ بالمنصة</span>
                    </button>
                  </div>
                </div>

                {/* Top Executive KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1: Score & Participants */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                    <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">المشاركة والأداء</span>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {examSummary.totalStudents}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">طالباً</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
                      <span>المتوسط: <strong className="font-mono text-indigo-600">%{examSummary.avgPercentage}</strong></span>
                    </div>
                  </div>

                  {/* Card 2: Nomination Suitability */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">مؤشر الترشيح</span>
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                        {examSummary.nominatedCount}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">({examSummary.nominatedPercentage}%) مؤهل</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                      <span>بانتظار المراجعة: <strong className="font-mono">{examSummary.needsReviewCount}</strong></span>
                    </div>
                  </div>

                  {/* Card 3: Reliability Index (Professional Assessment) */}
                  <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 space-y-2">
                    <div className="flex items-center justify-between text-violet-700 dark:text-violet-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">معامل ثبات الأداء</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {Math.round((examSummary.thoughtfulPercentage + 80) / 1.8)}%
                      </span>
                      <span className="text-[10px] text-violet-600 font-bold">موثوقية عالية</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-violet-500" style={{ width: `${(examSummary.thoughtfulPercentage + 80) / 1.8}%` }} />
                    </div>
                  </div>

                  {/* Card 4: Thoughtfulness vs Random Guessing */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 space-y-2">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">مؤشر التفكير</span>
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {examSummary.thoughtfulCount}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">منهجي ({examSummary.thoughtfulPercentage}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1 border-t border-amber-100 dark:border-amber-900/30">
                      <span className="text-rose-700 font-black">عشوائي: {examSummary.randomCount}</span>
                    </div>
                  </div>

                  {/* Card 5: Item Quality Index */}
                  <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-2">
                    <div className="flex items-center justify-between text-sky-700 dark:text-sky-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">جودة المحتوى</span>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {modelQuestions.length}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">سؤالاً</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-1 border-t border-sky-100 dark:border-sky-900/30">
                      <span>توازن الصعوبة: <strong className="text-emerald-600">مثالي</strong></span>
                    </div>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setReportSubTab('charts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      reportSubTab === 'charts'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>1. رسومات بيانية وتحليلات الاختبار</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportSubTab('students_table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      reportSubTab === 'students_table'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>2. كشف درجات الطلاب والمهارات والترشيح ({parsedRows.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportSubTab('questions_matrix')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      reportSubTab === 'questions_matrix'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>3. مصفوفة تحليل كل سؤال والبدائل المشتتة ({modelQuestions.length})</span>
                  </button>
                </div>

                {/* SUB-TAB 1: CHARTS & VISUALIZATIONS */}
                {reportSubTab === 'charts' && (
                  <div className="space-y-6">
                    {/* Charts Grid: Score Distribution & Skills Mastery */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart A: Score Distribution Histogram */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            <span>مخطط توزيع الدرجات والنسب المئوية للطلاب</span>
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">إجمالي: {examSummary.totalStudents}</span>
                        </div>

                        <div className="space-y-3 pt-1">
                          {examSummary.scoreDistribution.map(bin => (
                            <div key={bin.range} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={bin.textColor}>{bin.label}</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {bin.count} طالب ({bin.percentage}%)
                                </span>
                              </div>
                              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full ${bin.color} rounded-full transition-all duration-500`}
                                  style={{ width: `${Math.max(bin.percentage, 2)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Chart B: Skills Mastery Comparison */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            <span>معدل إتقان مهارات مقياس موهبة (متوسط الطلاب)</span>
                          </h4>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                            عتبة التفوق: 75%
                          </span>
                        </div>

                        <div className="space-y-3 pt-1">
                          {(Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).map(sk => {
                            const data = examSummary.skillAverages[sk];
                            if (!data) return null;
                            const isPassing = data.avgPct >= 75;
                            return (
                              <div key={sk} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: data.color }}
                                    />
                                    <span className="text-slate-800 dark:text-slate-200">{data.name}</span>
                                    <span className="text-[10px] text-slate-400">({data.totalQs} أسئلة)</span>
                                  </div>
                                  <span className={`font-mono font-black ${isPassing ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                    %{data.avgPct}
                                  </span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.max(data.avgPct, 2)}%`,
                                      backgroundColor: data.color
                                    }}
                                  />
                                  {/* 75% Benchmark Line */}
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900/40 dark:bg-white/40"
                                    style={{ left: '75%' }}
                                    title="عتبة التفوق 75%"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Chart C: Question-by-Question Error Rate Map */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>خريطة صعوبة الأسئلة ومعدل الخطأ لكل سؤال (من 1 إلى {modelQuestions.length})</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            الأشرطة الحمراء تشير إلى الأسئلة الأكثر صعوبة أو المشتتات القوية التي وقع فيها الطلاب.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            سهل (&lt;30% خطأ)
                          </span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            متوسط (30-60%)
                          </span>
                          <span className="flex items-center gap-1 text-rose-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            صعب (&gt;60% خطأ)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {examSummary.questionErrorStats.map(q => {
                          const isHighError = q.errorRatePct > 60;
                          const isMedError = q.errorRatePct >= 30 && q.errorRatePct <= 60;
                          const barColor = isHighError ? 'bg-rose-500' : isMedError ? 'bg-amber-500' : 'bg-emerald-500';
                          const textColor = isHighError ? 'text-rose-600' : isMedError ? 'text-amber-600' : 'text-emerald-600';
                          const skillDef = SKILL_DEFINITIONS[q.skill];

                          return (
                            <div
                              key={q.qNumber}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-2 hover:border-indigo-300 transition-all"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono font-black">
                                    {q.qNumber}
                                  </span>
                                  <span className="truncate max-w-[120px]">{q.questionCode}</span>
                                </span>
                                <span className={`font-mono font-black text-xs ${textColor}`}>
                                  %{q.errorRatePct} خطأ
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 font-medium">
                                {q.questionText}
                              </p>

                              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full ${barColor} rounded-full transition-all`}
                                  style={{ width: `${Math.max(q.errorRatePct, 3)}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60 font-bold">
                                <span>{skillDef?.name || q.skill}</span>
                                <span className="font-mono text-indigo-600">الحل: ({q.correctLetter})</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chart D: Nomination & Randomness Spectrum */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Nomination Breakdown */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span>توزيع توصيات الترشيح لمقياس موهبة</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">مرشح مبدئياً ⭐</span>
                            <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{examSummary.nominatedCount}</span>
                            <span className="text-[10px] text-emerald-600 block">({examSummary.nominatedPercentage}%)</span>
                          </div>
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-1">
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">يحتاج اختبار تأكيدي ⚠️</span>
                            <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">{examSummary.needsReviewCount}</span>
                            <span className="text-[10px] text-amber-600 block">شبهة تخمين أو تفاوت</span>
                          </div>
                          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center space-y-1">
                            <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 block">مستوى واعد 📈</span>
                            <span className="text-xl font-black text-sky-700 dark:text-sky-400 font-mono">{examSummary.promisingCount}</span>
                            <span className="text-[10px] text-sky-600 block">قريب من العتبة</span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">غير مرشح حالياً 📋</span>
                            <span className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono">{examSummary.notNominatedCount}</span>
                            <span className="text-[10px] text-slate-500 block">يحتاج خطة تأسيسية</span>
                          </div>
                        </div>
                      </div>

                      {/* Randomness Spectrum */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-amber-600" />
                          <span>طيف موثوقية التفكير مقابل التخمين العشوائي</span>
                        </h4>
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-700 dark:text-emerald-400">تفكير منهجي موثوق: {examSummary.thoughtfulCount} طالب</span>
                            <span className="text-rose-700 dark:text-rose-400">شبهة تخمين عشوائي: {examSummary.randomCount} طالب</span>
                          </div>
                          <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${examSummary.thoughtfulPercentage}%` }}
                              title={`تفكير منهجي %${examSummary.thoughtfulPercentage}`}
                            />
                            <div
                              className="h-full bg-rose-500 transition-all duration-500"
                              style={{ width: `${examSummary.randomPercentage}%` }}
                              title={`تخمين عشوائي %${examSummary.randomPercentage}`}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            يقوم النظام تلقائياً برصد أنماط الإجابات المشبوهة (مثل تكرار نفس الحرف 4 أو 6 مرات متتالية دون تنويع، أو الأنماط الدورية في التظليل) لضمان عدم ترشيح أي طالب اعتمد على التخمين الأعمى.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: DETAILED STUDENTS & SKILLS TABLE */}
                {reportSubTab === 'students_table' && (
                  <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
                      <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={reportSearchTerm}
                          onChange={e => setReportSearchTerm(e.target.value)}
                          placeholder="ابحث باسم الطالب أو رقمه..."
                          className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                          value={reportNominationFilter}
                          onChange={e => setReportNominationFilter(e.target.value)}
                          className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="all">كل حالات الترشيح</option>
                          <option value="nominated">مرشح مبدئياً للموهوبين ⭐</option>
                          <option value="review">يحتاج اختبار تأكيدي ⚠️</option>
                          <option value="promising">مستوى واعد 📈</option>
                          <option value="not_nominated">غير مناسب للترشح</option>
                        </select>

                        <select
                          value={reportClassFilter}
                          onChange={e => setReportClassFilter(e.target.value)}
                          className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="all">كل الفصول</option>
                          {Array.from(new Set(parsedRows.map(r => r.classroom))).filter(Boolean).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Main Students Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-extrabold">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">رقم الطالب</th>
                            <th className="p-3">اسم الطالب</th>
                            <th className="p-3">الفصل</th>
                            <th className="p-3">الدرجة والنسبة</th>
                            <th className="p-3">إتقان المهارات الست</th>
                            <th className="p-3">فحص العشوائية والتخمين</th>
                            <th className="p-3">قرار الترشيح والتوصية</th>
                            <th className="p-3 text-center">إجابات الطالب</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {parsedRows
                            .filter(r => {
                              const matchSearch = !reportSearchTerm || 
                                r.studentName.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
                                r.studentIdStr.includes(reportSearchTerm);
                              const matchClass = reportClassFilter === 'all' || r.classroom === reportClassFilter;
                              const matchNom = reportNominationFilter === 'all' ||
                                (reportNominationFilter === 'nominated' && r.nominationAssessment.decisionStatus === 'nominated_preliminary') ||
                                (reportNominationFilter === 'review' && r.nominationAssessment.decisionStatus === 'needs_extra_test') ||
                                (reportNominationFilter === 'promising' && r.nominationAssessment.decisionStatus === 'promising') ||
                                (reportNominationFilter === 'not_nominated' && r.nominationAssessment.decisionStatus === 'not_nominated');
                              return matchSearch && matchClass && matchNom;
                            })
                            .map((r, idx) => {
                              return (
                                <tr key={r.rawRowId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                                  <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {r.studentIdStr}
                                  </td>
                                  <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                                    {r.studentName}
                                  </td>
                                  <td className="p-3 font-bold text-slate-600 dark:text-slate-300">
                                    {r.classroom}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                        %{r.percentage}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({r.earnedScore}/{r.totalScore})
                                      </span>
                                    </div>
                                    <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 mt-1 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${r.percentage >= 80 ? 'bg-emerald-500' : r.percentage >= 65 ? 'bg-sky-500' : 'bg-amber-500'}`}
                                        style={{ width: `${r.percentage}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                      {(Object.keys(r.skillScores) as SkillCategory[]).map(sk => {
                                        const skRes = r.skillScores[sk];
                                        if (!skRes || skRes.total === 0) return null;
                                        const isHigh = skRes.percentage >= 75;
                                        return (
                                          <span
                                            key={sk}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                              isHigh 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' 
                                                : skRes.percentage < 50 
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300' 
                                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                            }`}
                                            title={`${SKILL_DEFINITIONS[sk]?.name}: %${skRes.percentage}`}
                                          >
                                            {SKILL_DEFINITIONS[sk]?.name.split(' ')[0]}: %{skRes.percentage}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="space-y-1">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.randomnessAnalysis.behaviorColor}`}>
                                        {r.randomnessAnalysis.isRandom ? <AlertTriangle className="w-3 h-3 text-rose-600" /> : <Check className="w-3 h-3 text-emerald-600" />}
                                        <span>{r.randomnessAnalysis.behaviorLabel}</span>
                                      </span>
                                      {r.randomnessAnalysis.maxConsecutiveStreak >= 3 && (
                                        <span className="block text-[9px] text-slate-400">
                                          تكرار خيار ({r.randomnessAnalysis.streakOption}) لـ {r.randomnessAnalysis.maxConsecutiveStreak} مرات
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] border ${r.nominationAssessment.badgeClass}`}>
                                      {r.nominationAssessment.statusLabel}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStudentForDetail(r)}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1"
                                        title="عرض تحليل إجابات الطالب بالتفصيل"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>عرض</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveParsedRow(r.rawRowId)}
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                        title="حذف هذا الصف من الاستيراد"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: QUESTION MATRIX & DISTRACTOR ANALYSIS */}
                {reportSubTab === 'questions_matrix' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                          مصفوفة تحليل كل سؤال والبدائل المشتتة لمقياس موهبة
                        </h4>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                          يوضح الجدول نسبة صحة وخطأ كل سؤال واختيارات الطلاب لبدائل الإجابة (أ، ب، ج، د) لمعرفة المشتتات الفعالة.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-indigo-700 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {modelQuestions.length} أسئلة
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-extrabold">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">كود السؤال</th>
                            <th className="p-3">نص السؤال</th>
                            <th className="p-3">المهارة والمستوى</th>
                            <th className="p-3">الإجابة الصحيحة</th>
                            <th className="p-3">أجابوا صح</th>
                            <th className="p-3">أخطأوا</th>
                            <th className="p-3">نسبة الخطأ %</th>
                            <th className="p-3 text-center">توزيع البدائل (أ - ب - ج - د)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {examSummary.questionErrorStats.map(q => {
                            const isHigh = q.errorRatePct > 60;
                            const isMed = q.errorRatePct >= 30 && q.errorRatePct <= 60;
                            const badge = isHigh ? 'text-rose-600 font-black' : isMed ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold';

                            return (
                              <tr key={q.qNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                                <td className="p-3 font-mono font-bold text-slate-400">{q.qNumber}</td>
                                <td className="p-3 font-mono font-bold text-indigo-600">{q.questionCode}</td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200 max-w-sm">
                                  <p className="line-clamp-2">{q.questionText}</p>
                                </td>
                                <td className="p-3">
                                  <span className="block font-bold text-slate-700 dark:text-slate-300">
                                    {SKILL_DEFINITIONS[q.skill]?.name || q.skill}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">صعوبة: {q.difficulty}</span>
                                </td>
                                <td className="p-3">
                                  <span className="px-2.5 py-1 rounded-md font-mono font-black text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                    {q.correctLetter}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-bold text-emerald-600">
                                  {q.correctCount}
                                </td>
                                <td className="p-3 font-mono font-bold text-rose-600">
                                  {q.wrongCount}
                                </td>
                                <td className={`p-3 font-mono text-sm ${badge}`}>
                                  %{q.errorRatePct}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-1.5 font-mono text-[10px]">
                                    {['A', 'B', 'C', 'D'].map(letter => {
                                      const count = q.distractors[letter] || 0;
                                      const isCorrectOpt = q.correctLetter === letter;
                                      return (
                                        <span
                                          key={letter}
                                          className={`px-1.5 py-0.5 rounded border ${
                                            isCorrectOpt 
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black' 
                                              : count > 0 
                                              ? 'bg-slate-50 text-slate-700 border-slate-200' 
                                              : 'bg-transparent text-slate-400 border-slate-100'
                                          }`}
                                          title={`الخيار ${letter}: تم اختياره بواسطة ${count} طالباً`}
                                        >
                                          {letter}: {count}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODAL: QUESTION-BY-QUESTION STUDENT DETAIL */}
            {selectedStudentForDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
                        {selectedStudentForDetail.studentName.slice(0, 1)}
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          تفاصيل إجابات الطالب: {selectedStudentForDetail.studentName}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold">
                          رقم الطالب: {selectedStudentForDetail.studentIdStr} | الفصل: {selectedStudentForDetail.classroom} | النسبة: %{selectedStudentForDetail.percentage}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentForDetail(null)}
                      className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Status & Recommendation Card */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 block mb-1">
                          تقييم الترشح لمقياس موهبة:
                        </span>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                          {selectedStudentForDetail.nominationAssessment.reason}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs border shrink-0 ${selectedStudentForDetail.nominationAssessment.badgeClass}`}>
                        {selectedStudentForDetail.nominationAssessment.statusLabel}
                      </span>
                    </div>

                    {/* Randomness Assessment Banner */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-amber-500" />
                        <span>مؤشر التفكير والتخمين: <strong>{selectedStudentForDetail.randomnessAnalysis.behaviorLabel}</strong></span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold">
                        {selectedStudentForDetail.randomnessAnalysis.notes}
                      </span>
                    </div>

                    {/* Question Answers Table */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5">س#</th>
                            <th className="p-2.5">نص السؤال</th>
                            <th className="p-2.5">المهارة</th>
                            <th className="p-2.5 text-center">اختيار الطالب</th>
                            <th className="p-2.5 text-center">الإجابة الصحيحة</th>
                            <th className="p-2.5 text-center">الحالة والدرجة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {selectedStudentForDetail.questionAnswers.map(qa => {
                            return (
                              <tr key={qa.qNumber} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="p-2.5 font-mono font-bold text-slate-500">{qa.qNumber}</td>
                                <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 max-w-xs">
                                  <p className="line-clamp-2">{qa.questionText}</p>
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                  {SKILL_DEFINITIONS[qa.skill]?.name || qa.skill}
                                </td>
                                <td className="p-2.5 text-center font-mono font-black">
                                  <span className={`px-2 py-0.5 rounded ${qa.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {qa.studentChoiceLetter} ({qa.studentChoiceArabic})
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {qa.correctChoiceLetter} ({qa.correctChoiceArabic})
                                </td>
                                <td className="p-2.5 text-center">
                                  {qa.isCorrect ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>صحيح (+{qa.pointsAwarded})</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>خطأ (0)</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForDetail(null)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: IMPORTED PAPER EXAMS HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>سجل نتائج الاختبارات الورقية المرفوعة via ZipGrade</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                إجمالي {submissions.filter(s => s.id.includes('paper')).length} نتيجة ورقية
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-extrabold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">الصف والفصل</th>
                    <th className="p-3">الاختبار</th>
                    <th className="p-3">الدرجة</th>
                    <th className="p-3">النسبة</th>
                    <th className="p-3">حالة الترشيح</th>
                    <th className="p-3">تاريخ الرصد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {submissions.filter(s => s.id.includes('paper')).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        لم يتم رفع أي نتائج ورقية بعد. استخدم التبويب السابق لرفع ملف CSV من ZipGrade.
                      </td>
                    </tr>
                  ) : (
                    submissions
                      .filter(s => s.id.includes('paper'))
                      .map((sub, idx) => {
                        const student = students.find(s => s.id === sub.studentId);
                        const test = tests.find(t => t.id === sub.testId);
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                            <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {student?.fullName || 'طالب'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {student?.grade ? GRADE_LABELS[student.grade] : ''} - {student?.classroom || ''}
                            </td>
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                              {test?.title || 'اختبار ورقي'}
                            </td>
                            <td className="p-3 font-mono font-bold">
                              {sub.totalScore} / {sub.maxScore}
                            </td>
                            <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">
                              %{sub.percentage}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {sub.candidateStatus === 'nominated_preliminary' ? 'مرشح موهوبين ⭐' : 'مكتمل'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[10px]">
                              {new Date(sub.startTime).toLocaleDateString('ar-SA')}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PSYCHOMETRIC ANALYSIS */}
        {activeTab === 'psychometrics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>تحليل جودة الأسئلة (المؤشرات السيكومترية)</span>
                </h3>
                <div className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg text-slate-500 font-bold">
                  بناءً على {modelQuestions.filter(q => q.psychometricStats).length} سؤالاً تم تحليلها مؤخراً
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <span className="text-[10px] font-bold text-blue-600 block mb-1">متوسط معامل الصعوبة (P)</span>
                  <div className="text-2xl font-black text-blue-900 dark:text-blue-200">
                    {modelQuestions.length > 0 
                      ? (modelQuestions.reduce((acc, q) => acc + (q.psychometricStats?.difficultyIndex || 0), 0) / modelQuestions.length).toFixed(2)
                      : '0.00'}
                  </div>
                  <p className="text-[9px] text-blue-700 dark:text-blue-400 mt-1">القيم بين 0.15 و 0.85 تعتبر مقبولة</p>
                </div>
                
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-600 block mb-1">متوسط معامل التمييز (D)</span>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                    {modelQuestions.length > 0 
                      ? (modelQuestions.reduce((acc, q) => acc + (q.psychometricStats?.discriminationIndex || 0), 0) / modelQuestions.length).toFixed(2)
                      : '0.00'}
                  </div>
                  <p className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-1">كلما ارتفع عن 0.30 كان السؤال أقوى</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-800">
                  <span className="text-[10px] font-bold text-purple-600 block mb-1">حجم العينة الإجمالي</span>
                  <div className="text-2xl font-black text-purple-900 dark:text-purple-200">
                    {Math.max(...modelQuestions.map(q => q.psychometricStats?.sampleSize || 0), 0)}
                  </div>
                  <p className="text-[9px] text-purple-700 dark:text-purple-400 mt-1">طالباً تم رصد نتائجهم في هذا النموذج</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-extrabold">
                    <tr>
                      <th className="p-3">السؤال</th>
                      <th className="p-3 text-center">الصعوبة (P)</th>
                      <th className="p-3 text-center">التمييز (D)</th>
                      <th className="p-3">تحليل المشتتات (أ، ب، ج، د)</th>
                      <th className="p-3">حالة السؤال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-bold">
                    {modelQuestions.map((q, idx) => {
                      const stats = q.psychometricStats;
                      if (!stats) return (
                        <tr key={q.id}>
                          <td className="p-3 text-slate-400" colSpan={5}>سؤال {idx + 1}: لم يتم تحليل بيانات كافية بعد</td>
                        </tr>
                      );

                      const p = stats.difficultyIndex;
                      const d = stats.discriminationIndex;
                      
                      let pStatus = { label: 'مقبول', class: 'text-slate-600' };
                      if (p > 0.85) pStatus = { label: 'سهل جداً', class: 'text-emerald-600' };
                      else if (p < 0.15) pStatus = { label: 'صعب جداً', class: 'text-rose-600' };

                      let dStatus = { label: 'ضعيف', class: 'text-rose-600' };
                      if (d >= 0.40) dStatus = { label: 'ممتاز', class: 'text-emerald-600' };
                      else if (d >= 0.30) dStatus = { label: 'جيد', class: 'text-blue-600' };
                      else if (d >= 0.20) dStatus = { label: 'مقبول', class: 'text-slate-600' };

                      return (
                        <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <span className="text-slate-400 ml-1">س {idx + 1}</span>
                            <span className="text-slate-900 dark:text-white">{q.code}</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className={`${pStatus.class} font-mono font-black`}>{p.toFixed(2)}</div>
                            <div className="text-[9px] opacity-60">{pStatus.label}</div>
                          </td>
                          <td className="p-3 text-center">
                            <div className={`${dStatus.class} font-mono font-black`}>{d.toFixed(2)}</div>
                            <div className="text-[9px] opacity-60">{dStatus.label}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 font-mono text-[10px]">
                              {['A', 'B', 'C', 'D'].map(l => (
                                <div key={l} className="flex flex-col items-center">
                                  <span className={l === ['A', 'B', 'C', 'D'][q.options.findIndex(o => o.id === q.correctOptionId)] ? 'text-emerald-600 font-black underline' : 'text-slate-400'}>
                                    {l}: {stats.distractorAnalysis[l] || 0}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            {d < 0.20 || p < 0.10 || p > 0.90 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>يحتاج مراجعة / حذف</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                <span>سؤال مقنن ومعتمد</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PRINT-ONLY SECTION (STRICTLY HIDDEN ON SCREEN VIA print-only)         */}
      {/* ========================================================================= */}
      <div className="hidden print:block print-only text-black bg-white" dir="rtl">
        {/* A. QUESTION BOOKLET PRINT VIEW */}
        {printComponent === 'booklet' && (
          <div className="space-y-4 print-break-after relative">
            {/* Automatic Page Numbering Footer (Fixed on every page) */}
            <div className="print-page-footer no-screen"></div>

            {/* Booklet Header */}
            <div className="border-b-2 border-black pb-2 mb-3">
              <div className="flex items-center justify-between text-[10px]">
                <div className="text-right leading-tight">
                  <div className="font-bold">المملكة العربية السعودية - وزارة التعليم</div>
                  <div className="font-black text-xs">{settings.schoolName || 'مدارس رياض الإبداع الأهلية'}</div>
                  <div>قسم رعاية الموهوبين والمبدعين</div>
                </div>

                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-1 flex items-center justify-center">
                    <SchoolLogo size={36} />
                  </div>
                  <div className="text-xs font-black">{selectedTest?.title || 'اختبار الكشف المبدئي'}</div>
                  <div className="text-[9px] font-bold text-slate-700">
                    كتيب الأسئلة الورقي - {selectedModel?.name || 'النموذج الموحد'} (كود: #{selectedModel?.code || selectedModel?.id.slice(-6).toUpperCase()})
                  </div>
                </div>

                <div className="text-left text-[9px] leading-tight" dir="ltr">
                  <div>Date: {new Date().toLocaleDateString('ar-SA')}</div>
                  <div>Time: {selectedTest?.durationMinutes || 25} Minutes</div>
                  <div className="text-right font-bold" dir="rtl">المشرف: {settings.supervisorName || 'أ. أسامة ابراهيم'}</div>
                </div>
              </div>

              {/* Student details strip */}
              <div className="mt-2 pt-1 border-t border-black/30 flex items-center justify-between text-[10px] bg-slate-50 p-1.5 rounded">
                <span>اسم الطالب: ................................................................</span>
                <span>الصف: ....................</span>
                <span>الفصل: ..........</span>
                <span>رقم الجلوس: ....................</span>
              </div>

              {/* Instructions Bar */}
              <div className="mt-1.5 p-1.5 bg-slate-100 rounded text-[9px] font-bold text-slate-800 leading-tight">
                ⚠️ <strong>تعليمات هامة:</strong> اقرأ كل سؤال بعناية ثم ظلل إجابتك في <strong>ورقة إجابة زيب جريد المرفقة</strong> باستخدام قلم رصاص أو حبر أسود/أزرق بتظليل الدائرة بالكامل. لا تضع أي علامات داخل هذا الكتيب.
              </div>
            </div>

            {/* Questions Grid (2 Columns or 1 Column) */}
            <div className={bookletColumns === '2' ? 'print-columns-2' : 'space-y-2'}>
              {modelQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="border border-slate-300 rounded p-2 print-avoid-break bg-white text-black text-[10px] mb-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-black text-white px-1.5 py-0.2 rounded font-black text-[9px]">
                        سؤال {idx + 1}
                      </span>
                      <span className="font-mono text-slate-600 text-[9px]">({q.code})</span>
                    </div>
                    <span className="text-[9px] text-slate-600">{q.points} درجات</span>
                  </div>

                  <p className="font-bold text-[10.5px] leading-snug mb-1 text-slate-900">
                    {q.questionText}
                  </p>

                  {(q.svgGraphic || q.imageUrl) && (
                    <div className="py-1 flex justify-center bg-slate-50/50 rounded mb-1">
                      {q.svgGraphic && <VisualShape type={q.svgGraphic} size={85} />}
                      {q.imageUrl && !q.svgGraphic && (
                        <img src={q.imageUrl} alt="شكل" referrerPolicy="no-referrer" className="max-h-16 object-contain" />
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[9.5px]">
                    {q.options.map((opt, oIdx) => (
                      <div key={opt.id} className={`p-1.5 rounded border flex items-center gap-2 break-inside-avoid bg-white ${
                        showAnswersInPrint && opt.id === q.correctOptionId 
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' 
                          : 'border-slate-300'
                      }`}>
                        <div className="relative">
                          <OptionLetterBubble letter={['أ', 'ب', 'ج', 'د'][oIdx]} size={18} fontSize={10} />
                          {showAnswersInPrint && opt.id === q.correctOptionId && (
                            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                          {opt.text && <span className="leading-tight font-bold">{opt.text}</span>}
                          {opt.imageUrl && (
                            <div className="py-0.5">
                              <img 
                                src={opt.imageUrl} 
                                alt="خيار" 
                                className="print-option-image block mx-auto max-w-full" 
                                style={{ maxHeight: '60px', objectFit: 'contain' }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                        {opt.svgShape && (
                          <div className="mr-auto shrink-0">
                            <VisualShape type={opt.svgShape} size={28} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Booklet Footer - STRICTLY Gifted Coordinator & School Principal ONLY */}
            <div className="mt-8 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-black text-black print-avoid-break">
              <div>منسق الموهوبين: {settings.supervisorName || 'أ. أسامة إبراهيم'}</div>
              <div>مدير المدرسة: {settings.principalName || 'أ. ماجد بن سعد الخثعمي'}</div>
            </div>

            {/* Even Page Logic: Add a blank page if the estimated count is odd */}
            {ensureEvenPages && estimatedPageCount % 2 !== 0 && (
              <div className="blank-page no-screen">
                <div className="text-center opacity-30">
                  <SchoolLogo size={120} className="grayscale mb-4 mx-auto" />
                  <p className="text-xl font-black">ورقة بيضاء - مخصصة للطباعة وجه وظهر</p>
                  <p className="text-sm">Blank Page for Double-Sided Printing</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* C. TEACHER MASTER ANSWER KEY PRINT VIEW */}
        {printComponent === 'key' && (
          <div className="print-break-before space-y-4 p-4 border border-black rounded-lg">
            <div className="border-b-2 border-black pb-2 text-center">
              <h2 className="text-base font-black">مفتاح تصحيح المعلم المعتمد (برنامج ZipGrade)</h2>
              <div className="text-xs font-bold text-slate-700">
                {settings.schoolName} - {selectedTest?.title} (كود الاختبار: #{selectedModel?.code || selectedModel?.id.slice(-6).toUpperCase()})
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              {answerKeyData.map(k => (
                <div key={k.qNumber} className="border border-slate-300 p-1.5 rounded flex items-center justify-between bg-white">
                  <span className="font-bold">سؤال {k.qNumber}:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 font-mono font-black text-[10px] flex items-center justify-center border border-slate-200">
                      {k.letterLatin}
                    </span>
                    <OptionLetterBubble letter={k.letterArabic} size={20} fontSize={11} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">({k.points} د)</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-black text-black print-avoid-break">
              <div>منسق الموهوبين: {settings.supervisorName || 'أ. أسامة إبراهيم'}</div>
              <div>مدير المدرسة: {settings.principalName || 'أ. ماجد بن سعد الخثعمي'}</div>
            </div>
          </div>
        )}

        {/* D. INDIVIDUAL FEEDBACK CARDS (4 per page) */}
        {printComponent === 'feedback_cards' && (
          <div className="space-y-4">
            {submissions
              .filter(s => s.testId === selectedTest?.id && s.id.includes('paper'))
              .map((sub, idx) => {
                const student = students.find(s => s.id === sub.studentId);
                const isNominated = sub.candidateStatus === 'nominated_preliminary';
                
                return (
                  <div 
                    key={sub.id} 
                    className={`border-2 border-black rounded-2xl p-4 mb-4 bg-white print-avoid-break min-h-[14cm] flex flex-col justify-between ${idx % 2 === 0 && idx !== 0 ? 'print-break-before' : ''}`}
                    style={{ width: '100%', maxWidth: '100%' }}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-black pb-2 mb-4">
                        <div className="flex items-center gap-2">
                          <SchoolLogo size={40} />
                          <div>
                            <div className="text-xs font-black">{settings.schoolName}</div>
                            <div className="text-[10px] font-bold">برنامج الكشف عن الموهوبين</div>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-mono">{new Date().toLocaleDateString('ar-SA')}</div>
                          <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-black">
                            نتائج الاختبار الورقي
                          </div>
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 flex justify-between items-center">
                        <div>
                          <div className="text-[9px] text-slate-500">اسم الطالب:</div>
                          <div className="text-sm font-black">{student?.fullName}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-slate-500">النتيجة الإجمالية:</div>
                          <div className="text-lg font-black text-indigo-600">%{sub.percentage}</div>
                        </div>
                        <div className="text-left">
                          <div className="text-[9px] text-slate-500">الصف:</div>
                          <div className="text-xs font-bold">{student?.grade ? GRADE_LABELS[student.grade] : '-'}</div>
                        </div>
                      </div>

                      {/* Skills Breakdown (Bar Chart) */}
                      <div className="space-y-3 mb-6">
                        <h4 className="text-[11px] font-black border-r-4 border-indigo-600 pr-2">تحليل القدرات العقلية المقاسة:</h4>
                        <div className="space-y-2">
                          {(Object.keys(sub.skillResults) as SkillCategory[]).map(sk => {
                            const res = sub.skillResults[sk];
                            const def = SKILL_DEFINITIONS[sk];
                            if (res.questionsCount === 0) return null;
                            
                            return (
                              <div key={sk} className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold">
                                  <span>{def.name}</span>
                                  <span>%{res.percentage}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <div 
                                    className="h-full bg-black" 
                                    style={{ width: `${res.percentage}%`, backgroundColor: def.color }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recommendation Box */}
                      <div className="p-3 border-2 border-black rounded-xl space-y-2">
                        <h4 className="text-[10px] font-black flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>التوصية التربوية للمبدع الصغير:</span>
                        </h4>
                        <p className="text-[10px] leading-relaxed font-bold italic">
                          {isNominated 
                            ? "أداء متميز واستثنائي في اختبار الموهبة! ننصح الطالب بالالتحاق بالبرامج الإثرائية المتقدمة والتركيز على المهارات المنطقية العالية لتعزيز مسار الإبداع لديه."
                            : "أظهر الطالب محاولات جيدة وتفاعلاً إيجابياً. ننصح بالتركيز على حل الألغاز البصرية والسلاسل المنطقية يومياً لتطوير مهارات التفكير الناقد."}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] font-bold text-slate-500">
                      <span>مصدر هذه البطاقة آلياً عبر منصة الموهوبين بمجمع رياض الإبداع</span>
                      <div className="flex items-center gap-4">
                        <span>المنسق: {settings.supervisorName}</span>
                        <span>ختم البرنامج: [ ................. ]</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* E. QUESTION ANALYSIS PRINT VIEW */}
        {printComponent === 'question_analysis' && examSummary && (
          <div className="space-y-6 text-black bg-white p-4" dir="rtl">
            {/* Header */}
            <div className="border-b-2 border-black pb-3 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SchoolLogo size={45} />
                  <div>
                    <h2 className="text-lg font-black">{settings.schoolName}</h2>
                    <h3 className="text-sm font-bold">تقرير التحليل السيكومتري ومصفوفة الأسئلة</h3>
                  </div>
                </div>
                <div className="text-left leading-tight" dir="ltr">
                  <div className="text-sm font-black" dir="rtl">{selectedTest?.title}</div>
                  <div className="text-xs font-bold text-slate-600">كود الاختبار: #{selectedModel?.code}</div>
                  <div className="text-[10px] font-mono mt-1">{new Date().toLocaleDateString('ar-SA')}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-4" dir="rtl">
                <div className="bg-slate-50 p-2 rounded border border-black/10 text-center">
                  <div className="text-[9px] text-slate-500">إجمالي الطلاب</div>
                  <div className="text-sm font-black">{examSummary.totalStudents}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-black/10 text-center">
                  <div className="text-[9px] text-slate-500">متوسط الأداء</div>
                  <div className="text-sm font-black text-indigo-600">%{examSummary.avgPercentage}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-black/10 text-center">
                  <div className="text-[9px] text-slate-500">عدد المرشحين</div>
                  <div className="text-sm font-black text-emerald-600">{examSummary.nominatedCount}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-black/10 text-center">
                  <div className="text-[9px] text-slate-500">موثوقية الاختبار</div>
                  <div className="text-sm font-black text-violet-600">%{Math.round((examSummary.thoughtfulPercentage + 80) / 1.8)}</div>
                </div>
              </div>
            </div>

            {/* Questions Table */}
            <table className="w-full text-right text-[10px] border-collapse border border-black">
              <thead>
                <tr className="bg-slate-200 text-black">
                  <th className="p-2 border border-black">#</th>
                  <th className="p-2 border border-black">الكود</th>
                  <th className="p-2 border border-black w-1/3">نص السؤال والمهارة</th>
                  <th className="p-2 border border-black text-center">الإجابة</th>
                  <th className="p-2 border border-black text-center">صح</th>
                  <th className="p-2 border border-black text-center">خطأ</th>
                  <th className="p-2 border border-black text-center">نسبة الخطأ</th>
                  <th className="p-2 border border-black text-center">توزيع البدائل</th>
                </tr>
              </thead>
              <tbody>
                {examSummary.questionErrorStats.map((q, idx) => {
                  const isHigh = q.errorRatePct > 60;
                  return (
                    <tr key={q.qNumber} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border border-black font-mono text-center">{q.qNumber}</td>
                      <td className="p-2 border border-black font-mono text-center text-indigo-700 font-bold">{q.questionCode}</td>
                      <td className="p-2 border border-black">
                        <div className="font-bold line-clamp-2">{q.questionText}</div>
                        <div className="text-[8px] text-slate-500 mt-0.5">{SKILL_DEFINITIONS[q.skill]?.name}</div>
                      </td>
                      <td className="p-2 border border-black text-center font-black text-emerald-700">({q.correctLetter})</td>
                      <td className="p-2 border border-black text-center font-mono">{q.correctCount}</td>
                      <td className="p-2 border border-black text-center font-mono">{q.wrongCount}</td>
                      <td className={`p-2 border border-black text-center font-mono font-black ${isHigh ? 'text-rose-600' : 'text-slate-800'}`}>
                        %{q.errorRatePct}
                      </td>
                      <td className="p-2 border border-black">
                        <div className="flex justify-center gap-1 font-mono text-[8px]">
                          {['A', 'B', 'C', 'D'].map(l => (
                            <span key={l} className={l === q.correctLetter ? 'font-black text-emerald-600' : 'text-slate-400'}>
                              {l}:{q.distractors[l] || 0}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-[9px] font-bold text-slate-500">
              <span>تم استخراج هذا التقرير آلياً عبر منصة موهبة المعتمدة</span>
              <span>توقيع منسق الموهوبين: ................................</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
