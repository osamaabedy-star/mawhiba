import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Test, 
  Question, 
  QuestionOption,
  TestModel, 
  GradeLevel, 
  TestLevel, 
  SkillCategory, 
  DifficultyLevel,
  Student,
  GRADE_LABELS, 
  TEST_LEVEL_LABELS, 
  SKILL_DEFINITIONS,
  AppSettings
} from '../types';
import { 
  Layers, 
  Plus, 
  Clock, 
  CheckCircle, 
  Eye, 
  Shuffle, 
  ArrowRight, 
  Save, 
  AlertCircle, 
  HelpCircle,
  X,
  Copy,
  FileCheck,
  Printer,
  FileCheck2,
  Edit3,
  CheckCircle2,
  Sparkles,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  RotateCcw,
  Check,
  Edit,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  BookOpen,
  Layout,
  ExternalLink,
  Sliders,
  Type,
  Download,
  Settings2,
  ZoomIn,
  ZoomOut,
  User,
  Users,
  CheckSquare,
  Square,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  UploadCloud,
  Hash
} from 'lucide-react';
import { seededShuffle } from '../utils/deterministic';
import { VisualShape } from './VisualShape';
import { PrintQuestionCard } from './QuestionBank';
import { SchoolLogo } from './SchoolLogo';

// Perfectly centered circular bubble for question option letters (أ، ب، ج، د)
// Using SVG text-anchor middle and dominant-baseline central for mathematical precision
export const OptionLetterBubble: React.FC<{
  letter: string;
  size?: number;
  fontSize?: number;
}> = ({ letter, size = 22, fontSize }) => {
  const actualFontSize = fontSize || Math.max(9, Math.round(size * 0.55));
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="shrink-0 select-none inline-block align-middle"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`
      }}
    >
      <circle cx="16" cy="16" r="14.5" stroke="#000000" strokeWidth="2.5" fill="#ffffff" />
      <text
        x="16"
        y="17"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={actualFontSize}
        fontWeight="900"
        fontFamily="Cairo, Tajawal, Arial, sans-serif"
        fill="#000000"
      >
        {letter}
      </text>
    </svg>
  );
};

// Generates the next sequential or incremented test code on every save (e.g. TEST-01 -> TEST-02)
export function generateNextTestCode(currentCode?: string): string {
  if (!currentCode) return 'TEST-01';
  const clean = currentCode.trim().toUpperCase().replace(/^#/, '');

  // If code ends with number like TEST-01, T-1, EXAM-G4-01
  const matchTrailingNum = clean.match(/^(.*?)(\d+)$/);
  if (matchTrailingNum) {
    const prefix = matchTrailingNum[1];
    const numStr = matchTrailingNum[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const padded = nextNum.toString().padStart(numStr.length, '0');
    return `${prefix}${padded}`;
  }

  // If code ends with -V1, -V2, etc.
  const matchVersion = clean.match(/^(.*?)-V(\d+)$/);
  if (matchVersion) {
    return `${matchVersion[1]}-V${parseInt(matchVersion[2], 10) + 1}`;
  }

  return `${clean}-02`;
}

interface TestBuilderProps {
  tests: Test[];
  questions: Question[];
  students?: Student[];
  settings?: AppSettings;
  onSaveTest: (test: Test) => void;
  onDeleteTest: (testId: string) => void;
  onLaunchStudentExamWithTest?: (testId: string, modelId: string) => void;
  onOpenZipGradeForTest?: (testId: string) => void;
  onEditQuestion?: (question: Question) => void;
  onSaveQuestion?: (question: Question) => void;
  onAddMultipleStudents?: (students: Student[]) => void;
  onUpdateMultipleStudents?: (students: Student[]) => void;
}

export const TestBuilder: React.FC<TestBuilderProps> = ({
  tests,
  questions,
  students = [],
  settings,
  onSaveTest,
  onDeleteTest,
  onLaunchStudentExamWithTest,
  onOpenZipGradeForTest,
  onEditQuestion,
  onSaveQuestion,
  onAddMultipleStudents,
  onUpdateMultipleStudents,
}) => {
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [previewTest, setPreviewTest] = useState<{ test: Test; model: TestModel } | null>(null);
  const [previewMinimalist, setPreviewMinimalist] = useState(false);
  const [modalTab, setModalTab] = useState<'edit' | 'preview_sheet' | 'print_preview'>('preview_sheet');
  const [quickEditQId, setQuickEditQId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState<{
    questionText: string;
    points: number;
    options: QuestionOption[];
    correctOptionId: string;
    explanation: string;
    svgGraphic?: string;
  } | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isAddingFromBank, setIsAddingFromBank] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankSkillFilter, setBankSkillFilter] = useState('all');
  const [validationError, setValidationError] = useState('');
  const [qSearch, setQSearch] = useState('');
  const [qSkill, setQSkill] = useState<string>('all');
  const [qDiff, setQDifficulty] = useState<string>('all');
  const [qGrade, setQGrade] = useState<string>('all');
  const [qSort, setQSort] = useState<'difficulty_asc' | 'difficulty_desc' | 'skill'>('difficulty_asc');

  // Paper Formatting & Customization States (Font, Size, Student Details, Page Breaks)
  const [paperFontFamily, setPaperFontFamily] = useState<'cairo' | 'tajawal' | 'amiri' | 'ibm'>('cairo');
  const [paperQuestionFontSize, setPaperQuestionFontSize] = useState<number>(14); // Question Text Font Size (px)
  const [paperOptionFontSize, setPaperOptionFontSize] = useState<number>(12); // Options / Answers Font Size (px)
  const [paperStudentName, setPaperStudentName] = useState<string>('');
  const [paperStudentGrade, setPaperStudentGrade] = useState<string>('');
  const [paperStudentSection, setPaperStudentSection] = useState<string>('');
  const [paperStudentLevel, setPaperStudentLevel] = useState<string>('المستوى الأول');
  const [paperLevelPosition, setPaperLevelPosition] = useState<'sidebar' | 'student_strip' | 'hidden'>('sidebar');
  const [paperTestCode, setPaperTestCode] = useState<string>('TEST-01');
  const [paperCompactSpacing, setPaperCompactSpacing] = useState<boolean>(true);
  const [paperShowInstructions, setPaperShowInstructions] = useState<boolean>(true);
  const [paperInstructionsText, setPaperInstructionsText] = useState<string>(
    'تعليمات الاختبار: اقرأ كل سؤال بعناية، ثم ظلل الدائرة المقابلة للإجابة الصحيحة في ورقة الإجابة المرفقة. تأكد من مراجعة كافة الأسئلة قبل التسليم.'
  );
  const [isPaperSettingsOpen, setIsPaperSettingsOpen] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'students' | 'layout' | 'header'>('students');
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [paperRepeatCount, setPaperRepeatCount] = useState<0 | 2 | 3>(0);
  const [paperCoordinatorName, setPaperCoordinatorName] = useState<string>('');
  const [hasOrderChanged, setHasOrderChanged] = useState<boolean>(false);
  const [showAnswersInPrint, setShowAnswersInPrint] = useState<boolean>(false);
  const [ensureEvenPages, setEnsureEvenPages] = useState<boolean>(true);
  const [finalSaveToast, setFinalSaveToast] = useState<string | null>(null);
  const [testSearchByCode, setTestSearchByCode] = useState<string>('');

  // Sync default paper student level, test code and shuffle state with test
  useEffect(() => {
    const lvl = previewTest?.test?.level || editingTest?.level;
    if (lvl) {
      if (lvl === 'distinction') setPaperStudentLevel('المستوى الثاني');
      else if (lvl === 'advanced') setPaperStudentLevel('المستوى الثالث');
      else setPaperStudentLevel('المستوى الأول');
    }
    if (previewTest) {
      setShuffleQuestions(Boolean(previewTest.test.shuffleQuestions));
      const rawCode = previewTest.model.code || previewTest.model.id.slice(-6).toUpperCase();
      const cleanCode = (rawCode === 'MOD-A' || rawCode === 'MOD_A') ? 'TEST-01' : rawCode;
      setPaperTestCode(cleanCode);
    }
  }, [previewTest?.test?.level, previewTest?.test?.id, editingTest?.level, previewTest?.model?.id, previewTest?.model?.code]);

  // Batch Student Printing States
  const [printModeTab, setPrintModeTab] = useState<'selected' | 'manual'>('selected');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('all');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [selectedClassroomKeys, setSelectedClassroomKeys] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [previewStudentIdx, setPreviewStudentIdx] = useState<number>(0);

  // AUTO-SELECT STUDENTS ASSIGNED TO THIS TEST
  useEffect(() => {
    if (previewTest?.test?.id) {
      const assignedIds = students
        .filter(s => s.assignedTestId === previewTest.test.id)
        .map(s => s.id);
      
      if (assignedIds.length > 0) {
        setSelectedStudentIds(prev => {
          // Merge with existing selection, avoiding duplicates
          const newSet = new Set([...prev, ...assignedIds]);
          return Array.from(newSet);
        });
      }
    }
  }, [previewTest?.test?.id, students]);

  // Unique classes/sections detected from all students (for multi-selection in printing)
  const uniqueClassesForPrinting = useMemo(() => {
    const map = new Map<string, { key: string; grade: GradeLevel; classroom: string; count: number; studentIds: string[] }>();
    students.forEach(s => {
      const g = (s.gradeLevel || s.grade || 'g3_primary') as GradeLevel;
      const c = s.classroom || 'عام';
      const key = `${g}___${c}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.studentIds.push(s.id);
      } else {
        map.set(key, {
          key,
          grade: g,
          classroom: c,
          count: 1,
          studentIds: [s.id],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.classroom.localeCompare(b.classroom));
  }, [students]);

  // Helper to sync paper settings back to the actual test model (for persistence)
  const syncPaperSettingsToModel = (updates: { code?: string; levelLabel?: string }) => {
    if (!previewTest) return;
    const { test, model } = previewTest;
    
    let needsSave = false;
    let updatedTest = { ...test };
    let updatedModel = { ...model };

    if (updates.code !== undefined && model.code !== updates.code) {
      updatedModel.code = updates.code;
      updatedModel.name = 'النموذج الموحد'; // Enforce unified model name
      needsSave = true;
    }

    if (updates.levelLabel !== undefined) {
      let levelValue: TestLevel = 'preparation';
      if (updates.levelLabel === 'المستوى الثاني') levelValue = 'distinction';
      else if (updates.levelLabel === 'المستوى الثالث') levelValue = 'advanced';
      
      if (test.level !== levelValue) {
        updatedTest.level = levelValue;
        needsSave = true;
      }
    }

    if (needsSave) {
      updatedTest.models = updatedTest.models.map(m => m.id === model.id ? updatedModel : m);
      onSaveTest(updatedTest);
      setPreviewTest({ test: updatedTest, model: updatedModel });
    }
  };

  // Derived question structure for preview/print (Sections vs Shuffle)
  const displayStructure = useMemo(() => {
    if (!previewTest) return [];
    const { model, test } = previewTest;
    
    // Direct control from user toggle
    const isShuffled = shuffleQuestions;

    // Use model ID as seed for deterministic shuffling
    const shuffleSeed = `seed_${model.id}_${isShuffled ? 'shuffled' : 'sections'}`;

    // Detect and mark manual duplicates in the model (by ID or exact Text)
    const seenIds = new Set<string>();
    const seenTexts = new Set<string>();
    let allQs = model.questionIds.map((id, index) => {
      const q = questions.find(item => item.id === id);
      if (!q) return null;
      
      const normalizedText = q.questionText.trim().toLowerCase();
      const isDuplicate = seenIds.has(id) || seenTexts.has(normalizedText);
      
      seenIds.add(id);
      seenTexts.add(normalizedText);
      
      if (isDuplicate) {
        return {
          ...q,
          id: `${q.id}_manual_rep_${index}_${Math.random().toString(36).substring(2, 5)}`,
          originalQuestionId: q.id,
          isConsistencyCheck: true,
          isNewPage: true
        };
      }
      return q;
    }).filter(Boolean) as Question[];
    
    // APPLY AUTO-REPEAT LOGIC FOR CONSISTENCY CHECK (IF SET IN UI)
    // ABSOLUTE_MAX_REPEATS is 3 as per user request
    const ABSOLUTE_MAX_REPEATS = 3;
    let existingRepeats = allQs.filter(q => q.isConsistencyCheck);
    
    // If existing repeats (manual or auto) exceed the limit, trim them immediately
    if (existingRepeats.length > ABSOLUTE_MAX_REPEATS) {
      let consistencyCount = 0;
      allQs = allQs.filter(q => {
        if (q.isConsistencyCheck) {
          consistencyCount++;
          return consistencyCount <= ABSOLUTE_MAX_REPEATS;
        }
        return true;
      });
      existingRepeats = allQs.filter(q => q.isConsistencyCheck);
    }

    // Only add more if we haven't reached the limit yet
    const targetRepeatCount = Math.min(ABSOLUTE_MAX_REPEATS, paperRepeatCount);
    const neededRepeats = Math.max(0, targetRepeatCount - existingRepeats.length);

    if (neededRepeats > 0 && allQs.length >= 5) {
      // Pick candidates from the middle of the test for better consistency check
      const candidates = allQs.filter(q => !q.isConsistencyCheck).slice(2, Math.max(5, allQs.length - 2));
      
      if (candidates.length > 0) {
        // Seeded pick for repeats
        const toRepeat = seededShuffle([...candidates], `${shuffleSeed}_repeats`)
          .slice(0, neededRepeats);
        
        const withRepeats = [...allQs];
        toRepeat.forEach((q, i) => {
          const repeatedQ = {
            ...q,
            id: `${q.id}_auto_rep_${existingRepeats.length + i}_static`, 
            originalQuestionId: q.id,
            isConsistencyCheck: true,
            isNewPage: true
          };
          // Insert near the end in a deterministic way (but before the last 2 questions)
          const insertPos = Math.max(0, withRepeats.length - 2);
          withRepeats.splice(insertPos, 0, repeatedQ);
        });
        
        allQs = withRepeats;
      }
    }

    if (isShuffled) {
      // Deterministic shuffle
      const shuffled = seededShuffle([...allQs], shuffleSeed);
      return [{ title: '', questions: shuffled }];
    }
    
    if (model.sections && model.sections.length > 0) {
      const sections = model.sections.map((sec, sIdx) => {
        const secQs = sec.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
        if (sIdx === model.sections!.length - 1 && paperRepeatCount > 0 && allQs.length > model.questionIds.length) {
          const repeats = allQs.filter(q => q.isConsistencyCheck);
          return { title: sec.title, questions: [...secQs, ...repeats] };
        }
        return { title: sec.title, questions: secQs };
      });
      return sections;
    }
    
    return [{ title: '', questions: allQs }];
  }, [previewTest, questions, shuffleQuestions, paperRepeatCount]);

  // Section & Manual Question States
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isAddingManualQuestion, setIsAddingManualQuestion] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isReviewingQuestions, setIsReviewingQuestions] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const manualFormRef = useRef<HTMLDivElement>(null);
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [draggingOptionIdx, setDraggingOptionIdx] = useState<number | null>(null);
  const [manualQuestionForm, setManualQuestionForm] = useState<Partial<Question>>({
    questionText: '',
    options: [
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ],
    correctOptionId: 'opt_1',
    skill: 'mental_flexibility',
    difficulty: 'medium',
    imageUrl: '',
  });

  const handleImageProcessing = (file: File, type: 'main' | 'option', optionIdx?: number) => {
    if (!file.type.startsWith('image/')) return;
    const maxSize = (type === 'main' ? 3 : 1) * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`حجم الصورة كبير جداً، يرجى اختيار صورة أقل من ${type === 'main' ? '3' : '1'} ميجابايت.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (type === 'main') {
        setManualQuestionForm(prev => ({ ...prev, imageUrl: base64 }));
      } else if (type === 'option' && typeof optionIdx === 'number') {
        setManualQuestionForm(prev => {
          const newOpts = [...(prev.options || [])];
          newOpts[optionIdx] = { ...newOpts[optionIdx], imageUrl: base64 };
          return { ...prev, options: newOpts };
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageProcessing(file, 'main');
  };

  const handleOptionImageUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageProcessing(file, 'option', idx);
  };

  const handleFormPaste = (e: React.ClipboardEvent, type: 'main' | 'option', optionIdx?: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageProcessing(file, type, optionIdx);
        }
      }
    }
  };

  const findSkillByLabel = (label: string): SkillCategory => {
    const cleanLabel = label.trim();
    const entry = Object.entries(SKILL_DEFINITIONS).find(([_, def]) => 
      def.name.includes(cleanLabel) || cleanLabel.includes(def.name)
    );
    return entry ? (entry[0] as SkillCategory) : 'mental_flexibility';
  };

  useEffect(() => {
    // Show all students by default to ensure uploaded ones appear, 
    // but the UI will highlight target grade classes.
    setStudentGradeFilter('all');
    setStudentClassFilter('all');
    setSelectedClassroomKeys([]);
    setStudentSearchTerm('');
    setPreviewStudentIdx(0);
  }, [previewTest?.test.id, previewTest?.model.id]);

  const searchFilteredTests = useMemo(() => {
    if (!testSearchByCode.trim()) return tests;
    const query = testSearchByCode.trim().toUpperCase();
    return tests.filter(t => {
      const matchTitle = t.title.toUpperCase().includes(query);
      const matchTestCode = t.code?.toUpperCase().includes(query);
      const matchModelCode = t.models.some(m => m.code?.toUpperCase().includes(query));
      return matchTitle || matchTestCode || matchModelCode;
    });
  }, [tests, testSearchByCode]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const sGrade = s.grade || s.gradeLevel;
      const sClass = s.classroom || 'عام';
      const sKey = `${sGrade}___${sClass}`;

      const matchGrade = studentGradeFilter === 'all' || sGrade === studentGradeFilter;
      
      // Multi-class match: if any class keys are selected, match them. 
      // Otherwise fallback to single studentClassFilter (for legacy/dropdown support)
      let matchClass = true;
      if (selectedClassroomKeys.length > 0) {
        matchClass = selectedClassroomKeys.includes(sKey);
      } else {
        matchClass = studentClassFilter === 'all' || s.classroom === studentClassFilter;
      }

      const matchSearch = !studentSearchTerm.trim() || s.fullName.toLowerCase().includes(studentSearchTerm.trim().toLowerCase());
      
      return matchGrade && matchClass && matchSearch;
    });
  }, [students, studentGradeFilter, studentClassFilter, selectedClassroomKeys, studentSearchTerm]);

  const problematicQuestionsCount = useMemo(() => {
    if (!previewTest) return 0;
    return previewTest.model.questionIds.reduce((count, qid) => {
      const q = questions.find(item => item.id === qid);
      if (q && (!q.options || q.options.length === 0)) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [previewTest, questions]);

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const currentPreviewStudent = useMemo(() => {
    if (selectedStudents.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(previewStudentIdx, selectedStudents.length - 1));
    return selectedStudents[safeIdx] || null;
  }, [selectedStudents, previewStudentIdx]);

  const handleSelectAllFiltered = () => {
    const ids = filteredStudents.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleToggleStudent = (sId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
    setPreviewStudentIdx(0);
  };

  const builderFilteredQs = useMemo(() => {
    if (!editingTest) return [];
    return questions.filter(q => {
      const matchesTestGrade = editingTest.targetGrades.length === 0 || editingTest.targetGrades.some(g => q.gradeLevels.includes(g));
      if (!matchesTestGrade) return false;
      const matchesSearch = !qSearch || q.title.toLowerCase().includes(qSearch.toLowerCase()) || q.code.toLowerCase().includes(qSearch.toLowerCase());
      const matchesSkill = qSkill === 'all' || q.skill === qSkill;
      const matchesDiff = qDiff === 'all' || q.difficulty === qDiff;
      return matchesSearch && matchesSkill && matchesDiff;
    }).sort((a, b) => {
      const diffWeights = { easy: 1, medium: 2, hard: 3, advanced: 4 };
      if (qSort === 'difficulty_asc') return (diffWeights[a.difficulty] || 2) - (diffWeights[b.difficulty] || 2);
      if (qSort === 'difficulty_desc') return (diffWeights[b.difficulty] || 2) - (diffWeights[a.difficulty] || 2);
      return a.skill.localeCompare(b.skill);
    });
  }, [questions, editingTest, qSearch, qSkill, qDiff, qSort]);

  const handleStartCreate = () => {
    const newTest: Test = {
      id: `test_${Date.now()}`,
      title: 'مقياس كشف مبدئي جديد',
      description: 'مقياس إلكتروني لقياس الاستعدادات والقدرات العقلية المتميزة لطلاب المدرسة.',
      targetGrades: [],
      level: 'distinction',
      coveredSkills: ['mental_flexibility', 'linguistic_reasoning', 'math_reasoning', 'spatial_visual'],
      durationMinutes: 25,
      pointsPerQuestion: 5,
      allowBackNavigation: true,
      shuffleQuestions: false,
      shuffleOptions: true,
      showInstantResults: true,
      instructions: 'عزيزي الطالب: اقرأ كل سؤال بعناية، وركز في الأنماط المعروضة قبل الإجابة. لا تستعجل في التسليم.',
      status: 'published',
      createdAt: new Date().toISOString().split('T')[0],
      assignedStudentIds: [],
      assignedGroupNames: [],
      models: [
        { id: `mod_${Date.now()}_1`, name: 'النموذج الموحد', code: 'TEST-01', questionIds: [] },
      ],
    };
    setEditingTest(newTest);
    setIsCreatingNew(true);
    setActiveModelIndex(0);
  };

  const handleAddParallelModel = () => {
    if (!editingTest) return;
    const nextNum = editingTest.models.length + 1;
    const arabicOrdinal = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][nextNum - 1] || `${nextNum}`;
    const codeLetter = ['أ', 'ب', 'ج', 'د', 'هـ'][nextNum - 1] || `${nextNum}`;
    const existingIds = new Set(editingTest.models.flatMap(m => m.questionIds));
    const available = questions.filter(q => !existingIds.has(q.id));
    const selectedIds = (available.length >= 4 ? available : questions).slice(0, 5).map(q => q.id);
    const newModel: TestModel = {
      id: `mod_${Date.now()}_${nextNum}`,
      name: `النموذج ${arabicOrdinal} (${codeLetter})`,
      code: `MOD-${codeLetter}`,
      questionIds: selectedIds,
    };
    setEditingTest({ ...editingTest, models: [...editingTest.models, newModel] });
    setActiveModelIndex(editingTest.models.length);
  };

  const toggleQuestionInModel = (questionId: string, modelIdx: number) => {
    if (!editingTest) return;
    const targetModel = editingTest.models[modelIdx];
    const exists = targetModel.questionIds.includes(questionId);
    const newQuestionIds = exists ? targetModel.questionIds.filter(id => id !== questionId) : [...targetModel.questionIds, questionId];
    const updatedModels = [...editingTest.models];
    updatedModels[modelIdx] = {
      ...targetModel,
      questionIds: newQuestionIds,
      sections: exists ? (targetModel.sections || []).map(s => ({ ...s, questionIds: s.questionIds.filter(id => id !== questionId) })) : targetModel.sections
    };
    setEditingTest({ ...editingTest, models: updatedModels });
  };

  const handleSave = () => {
    if (!editingTest) return;
    if (!editingTest.title.trim()) { setValidationError('يرجى إدخال اسم الاختبار.'); return; }
    if (editingTest.targetGrades.length === 0) { setValidationError('يرجى تحديد الصف الدراسي المستهدف أولاً.'); return; }
    const emptyModel = editingTest.models.find(m => m.questionIds.length === 0);
    if (emptyModel) { setValidationError(`النموذج (${emptyModel.name}) فارغ! يرجى إضافة أسئلة للنموذج.`); return; }
    
    // Automatically change/increment the code with every save operation
    const prevCode = editingTest.models[0]?.code || editingTest.code || 'TEST-01';
    const nextCode = generateNextTestCode(prevCode);
    const updatedModels = editingTest.models.map(m => ({
      ...m,
      code: nextCode,
    }));
    const testToSave: Test = {
      ...editingTest,
      code: nextCode,
      models: updatedModels,
    };

    onSaveTest(testToSave);
    setEditingTest(null);
    setIsCreatingNew(false);
    setValidationError('');
  };

  const handleSaveQuickEdit = (qId: string) => {
    if (!quickEditForm) return;
    const originalQ = questions.find(q => q.id === qId);
    if (!originalQ) return;
    if (!quickEditForm.questionText.trim()) { alert('يرجى إدخال نص السؤال'); return; }
    const updatedQ: Question = {
      ...originalQ,
      questionText: quickEditForm.questionText.trim(),
      points: Number(quickEditForm.points) || 5,
      options: quickEditForm.options,
      correctOptionId: quickEditForm.correctOptionId,
      explanation: quickEditForm.explanation.trim(),
      svgGraphic: quickEditForm.svgGraphic || undefined,
    };
    if (onSaveQuestion) onSaveQuestion(updatedQ);
    setSaveToast(`تم تحديث السؤال (${originalQ.code}) بنجاح!`);
    setTimeout(() => setSaveToast(null), 4000);
    setQuickEditQId(null);
    setQuickEditForm(null);
  };

  const handleRemoveQuestionFromModel = (qid: string) => {
    if (!previewTest) return;
    if (previewTest.model.questionIds.length <= 1) { alert('يجب أن يحتوي نموذج الاختبار على سؤال واحد على الأقل.'); return; }
    const qids = previewTest.model.questionIds.filter(id => id !== qid);
    const updatedModel: TestModel = { ...previewTest.model, questionIds: qids };
    const updatedModels = previewTest.test.models.map(m => m.id === updatedModel.id ? updatedModel : m);
    const updatedTest: Test = { ...previewTest.test, models: updatedModels };
    setPreviewTest({ test: updatedTest, model: updatedModel });
    onSaveTest(updatedTest);
  };

  // Permanently commit and lock the current question order with the test code!
  // Automatically advances code on each save operation
  const handleSaveFinalWithCode = () => {
    if (!previewTest) return;

    // Retrieve the exact visible questions in their current order
    const finalQuestionIds = displayStructure.flatMap(group => 
      group.questions.map(q => q.originalQuestionId || q.id)
    );

    // Generate next sequential code with every save operation
    const nextCode = generateNextTestCode(paperTestCode || previewTest.model.code || 'TEST-01');
    setPaperTestCode(nextCode);

    const updatedModel: TestModel = {
      ...previewTest.model,
      code: nextCode,
      questionIds: finalQuestionIds,
      name: previewTest.model.name || 'النموذج الموحد',
    };

    const updatedModels = previewTest.test.models.map(m => 
      m.id === updatedModel.id ? updatedModel : m
    );

    const updatedTest: Test = {
      ...previewTest.test,
      code: nextCode,
      shuffleQuestions: false, // Order is now permanently frozen
      models: updatedModels,
    };

    onSaveTest(updatedTest);
    setPreviewTest({ test: updatedTest, model: updatedModel });
    setShuffleQuestions(false);
    setHasOrderChanged(false);
    setPaperRepeatCount(0); // Reset repeat counter as they are now part of the frozen model

    setFinalSaveToast(`🎉 تم الحفظ وتحديث كود الاختبار تلقائياً إلى (#${nextCode}) وتثبيت ترتيب الأسئلة ومفتاح الإجابة الـ (${finalQuestionIds.length}) سؤالاً بشكل دائم ومطابق 100% للتصحيح.`);
    setTimeout(() => setFinalSaveToast(null), 5000);
  };

  // Move a question up or down in the preview and auto-update the version code
  const handleMoveQuestion = (qIndex: number, direction: 'up' | 'down') => {
    if (!previewTest) return;
    const currentIds = [...previewTest.model.questionIds];
    const targetIndex = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const temp = currentIds[qIndex];
    currentIds[qIndex] = currentIds[targetIndex];
    currentIds[targetIndex] = temp;

    const updatedModel: TestModel = {
      ...previewTest.model,
      questionIds: currentIds,
    };

    // Auto-suggest next version code
    const baseCode = paperTestCode.replace(/-V\d+$/, '').replace(/-R\d+$/, '');
    const newVersionCode = `${baseCode}-V${Math.floor(2 + Math.random() * 8)}`;
    setPaperTestCode(newVersionCode);
    setHasOrderChanged(true);

    const updatedModels = previewTest.test.models.map(m => m.id === updatedModel.id ? updatedModel : m);
    const updatedTest = { ...previewTest.test, models: updatedModels };
    setPreviewTest({ test: updatedTest, model: updatedModel });
  };

  // Re-shuffle order and generate a smart new code
  const handleShuffleAndReorder = () => {
    if (!previewTest) return;
    const currentIds = [...previewTest.model.questionIds];
    for (let i = currentIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentIds[i], currentIds[j]] = [currentIds[j], currentIds[i]];
    }

    const baseCode = paperTestCode.replace(/-V\d+$/, '').replace(/-R\d+$/, '');
    const newCode = `${baseCode}-R${Math.floor(10 + Math.random() * 89)}`;
    setPaperTestCode(newCode);
    setHasOrderChanged(true);

    const updatedModel = { ...previewTest.model, code: newCode, questionIds: currentIds };
    const updatedModels = previewTest.test.models.map(m => m.id === updatedModel.id ? updatedModel : m);
    const updatedTest = { ...previewTest.test, models: updatedModels };
    setPreviewTest({ test: updatedTest, model: updatedModel });
    setShuffleQuestions(false);
  };

  const toggleQuestionInSection = (questionId: string, modelIdx: number, sectionId: string) => {
    if (!editingTest) return;
    const currentModel = editingTest.models[modelIdx];
    const updatedModels = [...editingTest.models];
    updatedModels[modelIdx] = {
      ...currentModel,
      questionIds: currentModel.questionIds.includes(questionId) ? currentModel.questionIds : [...currentModel.questionIds, questionId],
      sections: (currentModel.sections || []).map(s => {
        if (s.id === sectionId) {
          const exists = s.questionIds.includes(questionId);
          return { ...s, questionIds: exists ? s.questionIds.filter(id => id !== questionId) : [...s.questionIds, questionId] };
        }
        return s;
      }),
    };
    setEditingTest({ ...editingTest, models: updatedModels });
  };

  const handleSaveManualQuestion = async (modelIdx: number, sectionId: string | null) => {
    if (!editingTest || !onSaveQuestion) return;
    if (!manualQuestionForm.questionText?.trim()) { alert('يرجى إدخال نص السؤال'); return; }
    const isEditing = !!manualQuestionForm.id;
    const existingQ = isEditing ? questions.find(q => q.id === manualQuestionForm.id) : null;
    const qId = manualQuestionForm.id || `q_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newQuestion: Question = {
      id: qId,
      code: existingQ?.code || `M-Q-${Math.floor(100 + Math.random() * 900)}`,
      title: manualQuestionForm.questionText.substring(0, 30) + '...',
      questionText: manualQuestionForm.questionText,
      options: (manualQuestionForm.options || []) as QuestionOption[],
      correctOptionId: manualQuestionForm.correctOptionId || 'opt_1',
      skill: manualQuestionForm.skill || 'mental_flexibility',
      difficulty: manualQuestionForm.difficulty || 'medium',
      imageUrl: manualQuestionForm.imageUrl || undefined,
      gradeLevels: manualQuestionForm.gradeLevels || editingTest.targetGrades,
      points: manualQuestionForm.points || editingTest.pointsPerQuestion || 5,
      estimatedTimeSeconds: manualQuestionForm.estimatedTimeSeconds || 60,
      status: manualQuestionForm.status || 'active',
      usageCount: manualQuestionForm.usageCount || 0,
      correctAnswersCount: manualQuestionForm.correctAnswersCount || 0,
      explanation: manualQuestionForm.explanation || '',
      type: manualQuestionForm.type || 'multiple_choice_4',
      isExperimental: manualQuestionForm.isExperimental || false
    };
    onSaveQuestion(newQuestion);
    if (!isEditing) {
      const currentModel = editingTest.models[modelIdx];
      const updatedModels = [...editingTest.models];
      updatedModels[modelIdx] = { ...currentModel, questionIds: currentModel.questionIds.includes(qId) ? currentModel.questionIds : [...currentModel.questionIds, qId] };
      if (sectionId) {
        updatedModels[modelIdx].sections = (currentModel.sections || []).map(s => s.id === sectionId ? { ...s, questionIds: s.questionIds.includes(qId) ? s.questionIds : [...s.questionIds, qId] } : s);
      }
      setEditingTest({ ...editingTest, models: updatedModels });
    }
    setIsAddingManualQuestion(false);
    setManualQuestionForm({ questionText: '', options: [{ id: 'opt_1', text: '' }, { id: 'opt_2', text: '' }, { id: 'opt_3', text: '' }, { id: 'opt_4', text: '' }], correctOptionId: 'opt_1', skill: 'mental_flexibility', difficulty: 'medium', imageUrl: '' });
    setSaveToast(isEditing ? 'تم تحديث السؤال بنجاح!' : 'تمت إضافة السؤال بنجاح!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleProcessBulkAdd = (modelIdx: number) => {
    if (!bulkInputText.trim() || !editingTest || !onSaveQuestion) return;
    const lines = bulkInputText.trim().split('\n');
    const newQIds: string[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/[|]/).map(p => p.trim());
      let skill: SkillCategory = 'mental_flexibility';
      let qText = '';
      let optsText: string[] = [];
      let correctIdx = 0;
      if (parts.length >= 7) { skill = findSkillByLabel(parts[0]); qText = parts[1]; optsText = [parts[2], parts[3], parts[4], parts[5]]; correctIdx = parseInt(parts[6] || '0') || 0; }
      else if (parts.length === 6) { qText = parts[0]; optsText = [parts[1], parts[2], parts[3], parts[4]]; correctIdx = parseInt(parts[5] || '0') || 0; }
      else if (parts.length >= 4) { skill = findSkillByLabel(parts[0]); qText = parts[1]; optsText = parts[2].split(',').map(o => o.trim()); correctIdx = parseInt(parts[3] || '0') || 0; }
      else if (parts.length >= 3) { qText = parts[0]; optsText = parts[1].split(',').map(o => o.trim()); correctIdx = parseInt(parts[2] || '0') || 0; }
      else if (parts.length === 2) { qText = parts[0]; optsText = parts[1].split(',').map(o => o.trim()); correctIdx = 0; }
      else return;
      if (qText && optsText.length > 0) {
        const qId = `bulk_test_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        const newQuestion: Question = {
          id: qId, code: `B-Q-${Math.floor(1000 + Math.random() * 9000)}`, title: qText.substring(0, 30) + '...', questionText: qText, type: 'multiple_choice_4',
          options: Array(4).fill(null).map((_, i) => ({ id: `opt_${i + 1}`, text: optsText[i] || `خيار احتياطي ${i + 1}` })),
          correctOptionId: `opt_${(correctIdx % 4) + 1}`, explanation: '', skill: skill, gradeLevels: editingTest.targetGrades, difficulty: 'medium', points: editingTest.pointsPerQuestion || 5, estimatedTimeSeconds: 60, isExperimental: false, status: 'active', usageCount: 0, correctAnswersCount: 0,
        };
        onSaveQuestion(newQuestion);
        newQIds.push(qId);
      }
    });
    if (newQIds.length > 0) {
      const currentModel = editingTest.models[modelIdx];
      const updatedModels = [...editingTest.models];
      updatedModels[modelIdx] = { ...currentModel, questionIds: [...currentModel.questionIds, ...newQIds] };
      setEditingTest({ ...editingTest, models: updatedModels });
      setBulkInputText(''); setIsBulkAddOpen(false);
      setSaveToast(`تم إضافة ${newQIds.length} سؤال بنجاح!`);
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  const getFontFamilyCss = (fontKey: string) => {
    switch (fontKey) {
      case 'cairo': return "'Cairo', sans-serif";
      case 'tajawal': return "'Tajawal', sans-serif";
      case 'amiri': return "'Amiri', serif";
      case 'ibm': return "'IBM Plex Sans Arabic', sans-serif";
      case 'system': return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      default: return "'Cairo', sans-serif";
    }
  };

  const handlePrintBooklet = () => {
    // Robust Print logic: Try direct print, then fallback to new window, then fallback to HTML download
    const printContent = document.getElementById('printable-test-booklet');
    if (!printContent) {
      alert('حدث خطأ: لم يتم العثور على محتوى الاختبار للطباعة.');
      return;
    }

    try {
      // 1. Try normal print
      window.print();
    } catch (e) {
      console.warn('Standard window.print failed, trying isolated window approach...', e);
      
      // 2. Fallback: Open in new window for clean print context
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const testTitle = previewTest?.test.title || 'اختبار';
        const styles = Array.from(document.styleSheets)
          .map(styleSheet => {
            try {
              return Array.from(styleSheet.cssRules)
                .map(rule => rule.cssText)
                .join('');
            } catch (e) {
              return '';
            }
          })
          .join('\n');

        printWindow.document.write(`
          <html lang="ar" dir="rtl">
            <head>
              <title>${testTitle}</title>
              <style>${styles}</style>
              <style>
                body { background: white !important; padding: 0 !important; margin: 0 !important; }
                .print-only { display: block !important; }
                .no-print { display: none !important; }
              </style>
            </head>
            <body>
              <div class="print-only">${printContent.innerHTML}</div>
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                  }, 700);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // 3. Last resort: HTML Download
        handleDownloadHtmlFile();
      }
    }
  };

  const handleDownloadHtmlFile = () => {
    const bookletEl = document.getElementById('printable-test-booklet');
    if (!bookletEl) return;
    const testTitle = previewTest?.test.title || 'اختبار';
    const testCode = paperTestCode || 'TEST-01';
    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${testTitle} - كود #${testCode}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
    * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; font-family: ${getFontFamilyCss(paperFontFamily)}; font-size: ${paperQuestionFontSize}px; line-height: 1.35; direction: rtl; }
    .student-exam-booklet { width: 100% !important; page-break-after: always !important; break-after: page !important; }
    .student-exam-booklet:last-child { page-break-after: avoid !important; break-after: avoid !important; }
    .print-avoid-break, .question-print-item { break-inside: avoid !important; page-break-inside: avoid !important; -webkit-column-break-inside: avoid !important; display: block !important; margin-bottom: 3.5mm !important; border: 1.5px solid #334155 !important; border-radius: 8px !important; padding: 8px 10px !important; background: #fff !important; }
    .print-columns-2 { column-count: 2 !important; column-gap: 5mm !important; column-fill: auto !important; }
    .print-columns-1 { display: block !important; width: 100% !important; }
    .border { border: 1px solid #94a3b8 !important; } .border-2 { border: 2px solid #000 !important; } .border-b-2 { border-bottom: 2px solid #000 !important; } .border-b { border-bottom: 1px solid #cbd5e1 !important; }
    .rounded-lg { border-radius: 6px; } .rounded { border-radius: 4px; } .rounded-full { border-radius: 9999px; }
    .p-1 { padding: 4px; } .p-2 { padding: 8px; } .p-3 { padding: 10px; }
    .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; }
    .bg-white { background-color: #ffffff; } .bg-slate-50 { background-color: #f8fafc; } .bg-black { background-color: #000; color: #fff; }
    .text-black { color: #000; } .text-white { color: #fff; } .font-bold { font-weight: 700; } .font-black { font-weight: 900; }
    .flex { display: flex; } .items-center { align-items: center; } .justify-between { justify-content: space-between; }
    .grid { display: grid; } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .w-full { width: 100%; } .text-right { text-align: right; } .text-center { text-align: center; } .text-left { text-align: left; }
    svg { vertical-align: middle; display: inline-block; }
    img { max-width: 90% !important; max-height: 80px !important; object-fit: contain !important; display: block !important; margin: 3px auto !important; }
    .on-screen-toolbar { background: #0f172a; color: #fff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 15px; font-family: sans-serif; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .on-screen-toolbar button { background: #0284c7; color: #fff; border: 0; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
    .on-screen-toolbar button:hover { background: #0369a1; }
    @media print { .no-print, .on-screen-toolbar { display: none !important; } }
  </style>
</head>
<body>
  <div class="on-screen-toolbar no-print">
    <div>
      <strong>📄 تم تجهيز الاختبار للطباعة والحفظ: ${testTitle} (كود #${testCode})</strong>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">لحفظ كملف PDF: اختر الوجهة (Save as PDF) من نافذة الطباعة.</div>
    </div>
    <button onclick="window.print()">🖨️ طباعة الآن / حفظ كـ PDF</button>
  </div>
  ${bookletEl.innerHTML}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ورقة_اختبار_${testTitle}_كود_${testCode}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <span>منشئ ومصمم الاختبارات والنماذج</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">توليد نماذج اختبارات متكافئة لكل مرحلة ومستوى</p>
          </div>
          {!editingTest && (
            <button onClick={handleStartCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer shrink-0">
              <Plus className="w-4 h-4" />
              <span>إنشاء اختبار جديد</span>
            </button>
          )}
        </div>

        {/* SEARCH BAR FOR TEST CODES */}
        {!editingTest && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 w-full">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 text-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={testSearchByCode} 
                  onChange={e => setTestSearchByCode(e.target.value)} 
                  placeholder="ابحث برمز الاختبار (مثال: TEST-01) أو اسم الاختبار..." 
                  className="w-full pr-4 pl-10 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all" 
                />
                {testSearchByCode && (
                  <button 
                    onClick={() => setTestSearchByCode('')} 
                    className="absolute left-3 top-2.5 p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>عدد الاختبارات المتاحة: {tests.length}</span>
            </div>
          </div>
        )}

        {editingTest ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 space-y-8 shadow-xl">
             <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-900 text-sky-600 flex items-center justify-center shadow-inner">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{isCreatingNew ? 'تجهيز اختبار جديد' : 'تعديل الاختبار الحالي'}</h3>
                    <p className="text-xs text-slate-500">قم بضبط إعدادات الاختبار واختيار الأسئلة لكل نموذج</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">اسم الاختبار/المقياس</label>
                      <input type="text" value={editingTest.title} onChange={e => setEditingTest({ ...editingTest, title: e.target.value })} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold" placeholder="مثلاً: مقياس موهبة - المستوى الأول" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">مدة الاختبار (دقيقة)</label>
                        <div className="relative">
                          <input type="number" value={editingTest.durationMinutes} onChange={e => setEditingTest({ ...editingTest, durationMinutes: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold" />
                          <Clock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">النقاط لكل سؤال</label>
                        <input type="number" value={editingTest.pointsPerQuestion} onChange={e => setEditingTest({ ...editingTest, pointsPerQuestion: parseInt(e.target.value) || 5 })} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">الصف الدراسي المستهدف</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(GRADE_LABELS).map(([val, label]) => (
                          <button key={val} type="button" onClick={() => {
                            const current = editingTest.targetGrades;
                            const updated = current.includes(val as GradeLevel) ? current.filter(g => g !== val) : [...current, val as GradeLevel];
                            setEditingTest({ ...editingTest, targetGrades: updated });
                          }} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${editingTest.targetGrades.includes(val as GradeLevel) ? 'bg-sky-600 border-sky-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-600'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold text-xs mb-2">
                    <Shuffle className="w-4 h-4" />
                    <span>إعدادات النماذج والأسئلة العشوائية</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-10 h-6 rounded-full transition-all relative ${editingTest.shuffleQuestions ? 'bg-sky-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingTest.shuffleQuestions ? 'right-5' : 'right-1'}`} />
                      </div>
                      <input type="checkbox" checked={editingTest.shuffleQuestions} onChange={e => setEditingTest({ ...editingTest, shuffleQuestions: e.target.checked })} className="hidden" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تغيير ترتيب الأسئلة لكل طالب</span>
                    </label>
                  </div>
                </div>

                {/* Models Management */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Layout className="w-5 h-5 text-indigo-600" />
                      <span>نماذج الاختبار الموازية ({editingTest.models.length})</span>
                    </h4>
                    <button type="button" onClick={handleAddParallelModel} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors cursor-pointer">إضافة نموذج موازٍ</button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {editingTest.models.map((mod, mIdx) => (
                      <button key={mod.id} type="button" onClick={() => { setActiveModelIndex(mIdx); setActiveSectionId(null); }} className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2 ${activeModelIndex === mIdx ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:border-indigo-300'}`}>
                        {mod.name} ({mod.questionIds.length})
                      </button>
                    ))}
                  </div>

                  <div className="p-5 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <button type="button" onClick={() => setIsReviewingQuestions(!isReviewingQuestions)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-50">
                           <BookOpen className="w-4 h-4" />
                           <span>مراجعة الأسئلة ({editingTest.models[activeModelIndex].questionIds.length})</span>
                         </button>
                         <button type="button" onClick={() => setIsBulkAddOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-50">
                           <Plus className="w-4 h-4" />
                           <span>إضافة أسئلة بالجملة</span>
                         </button>
                      </div>
                      <button type="button" onClick={() => setIsAddingManualQuestion(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md">
                        <Edit3 className="w-4 h-4" />
                        <span>إنشاء سؤال يدوي</span>
                      </button>
                    </div>

                    {isBulkAddOpen && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 space-y-4">
                        <textarea value={bulkInputText} onChange={e => setBulkInputText(e.target.value)} rows={6} className="w-full px-3 py-2 text-xs border rounded-xl" placeholder="الصق أسئلتك هنا..." />
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setIsBulkAddOpen(false)} className="px-3 py-1.5 text-xs">إلغاء</button>
                           <button onClick={() => handleProcessBulkAdd(activeModelIndex)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs">بدء المعالجة</button>
                        </div>
                      </div>
                    )}

                    {isReviewingQuestions && (
                       <div className="space-y-2 max-h-64 overflow-y-auto p-2">
                         {editingTest.models[activeModelIndex].questionIds.map(qid => {
                           const q = questions.find(item => item.id === qid);
                           if (!q) return null;
                           return (
                             <div key={qid} className="p-3 bg-white rounded-xl border flex items-center justify-between text-xs">
                               <span className="font-bold truncate">{q.questionText}</span>
                               <button onClick={() => toggleQuestionInModel(qid, activeModelIndex)} className="text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
                             </div>
                           );
                         })}
                       </div>
                    )}
                  </div>

                  {/* Manual Question Form */}
                  {isAddingManualQuestion && (
                    <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-200 space-y-4">
                       <textarea value={manualQuestionForm.questionText} onChange={e => setManualQuestionForm({ ...manualQuestionForm, questionText: e.target.value })} rows={2} className="w-full p-3 border rounded-xl" placeholder="نص السؤال..." />
                       <div className="flex justify-end gap-2">
                         <button onClick={() => setIsAddingManualQuestion(false)}>إلغاء</button>
                         <button onClick={() => handleSaveManualQuestion(activeModelIndex, null)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl">حفظ السؤال</button>
                       </div>
                    </div>
                  )}

                  {/* Bank Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <input type="text" value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="ابحث في بنك الأسئلة..." className="flex-1 p-2 border rounded-xl text-xs" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {builderFilteredQs.map(q => {
                        const isSelected = editingTest.models[activeModelIndex].questionIds.includes(q.id);
                        return (
                          <div key={q.id} onClick={() => toggleQuestionInModel(q.id, activeModelIndex)} className={`p-3 border rounded-xl cursor-pointer ${isSelected ? 'bg-sky-50 border-sky-400' : 'bg-white'}`}>
                            <p className="text-xs font-bold truncate">{q.questionText}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
             </div>
             <div className="flex justify-between pt-6 border-t">
               <button onClick={() => setEditingTest(null)} className="px-4 py-2 text-slate-500">إلغاء</button>
               <button onClick={handleSave} className="bg-sky-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg">حفظ الاختبار</button>
             </div>
          </div>
        ) : (
          /* Tests Listing */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {searchFilteredTests.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Hash className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-bold">لا توجد اختبارات تطابق رمز البحث "#{testSearchByCode}"</p>
                <button onClick={() => setTestSearchByCode('')} className="mt-4 text-indigo-600 font-bold text-sm hover:underline cursor-pointer">عرض كافة الاختبارات</button>
              </div>
            ) : searchFilteredTests.map(test => (
              <div key={test.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{test.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {test.targetGrades.map(g => (
                      <span key={g} className="text-[9px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/60 font-bold">
                        {GRADE_LABELS[g]}
                      </span>
                    ))}
                  </div>

                  {/* DISPLAY ALL ASSOCIATED CODES FOR DIRECT ACCESS */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {test.models.map(m => {
                      const mCode = m.code || m.id.slice(-6).toUpperCase();
                      const isMatch = testSearchByCode && mCode.toUpperCase().includes(testSearchByCode.toUpperCase());
                      return (
                        <button 
                          key={m.id} 
                          onClick={() => setPreviewTest({ test, model: m })}
                          title={`فتح النموذج: ${m.name} (كود #${mCode})`}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-black transition-all cursor-pointer ${
                            isMatch 
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400 scale-105' 
                              : 'bg-slate-50 dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-300'
                          }`}
                        >
                          <Hash className="w-2.5 h-2.5" />
                          <span>{mCode}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t gap-2">
                  <div className="flex gap-1">
                    <button onClick={() => setPreviewTest({ test, model: test.models[0] })} className="p-2 bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-xl cursor-pointer hover:bg-sky-100"><Eye className="w-4 h-4" /></button>
                    <button 
                      type="button"
                      onClick={() => setTestToDelete(test)} 
                      className="p-2 bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      title="حذف الاختبار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => setPreviewTest({ test, model: test.models[0] })} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer hover:bg-emerald-700">
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screen Preview & Questions Editor Modal */}
      {previewTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{previewTest.test.title}</h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    كود الاختبار: #{paperTestCode}
                  </span>
                  {paperLevelPosition !== 'hidden' && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {paperStudentLevel}
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    ✓ نموذج موحد
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* PRIMARY ACTION: Print / Save PDF */}
                <button
                  type="button"
                  onClick={handlePrintBooklet}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  title="طباعة ورقة الاختبار فوراً أو حفظها كملف PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    طباعة الاختبار (PDF) {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length} طالب)` : ''}
                  </span>
                </button>

                {/* TOGGLE SETTINGS DRAWER BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsPaperSettingsOpen(!isPaperSettingsOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    isPaperSettingsOpen 
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300 dark:ring-sky-800' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                  title="فتح أو إغلاق خيارات التنسيق والطلاب"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>تخصيص الإعدادات والطلاب</span>
                  {selectedStudentIds.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black flex items-center justify-center">
                      {selectedStudentIds.length}
                    </span>
                  )}
                </button>

                {/* Final Save With Code Button */}
                <button
                  type="button"
                  onClick={handleSaveFinalWithCode}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer"
                  title="تثبيت ترتيب الأسئلة الحالي وحفظ الكود"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الكود والترتيب</span>
                </button>

                {/* Download HTML Button */}
                <button
                  type="button"
                  onClick={handleDownloadHtmlFile}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl transition-colors cursor-pointer"
                  title="تحميل كملف HTML مستقل"
                >
                  <Download className="w-4 h-4 text-sky-600" />
                </button>

                {/* Delete button from modal */}
                <button
                  type="button"
                  onClick={() => setTestToDelete(previewTest.test)}
                  className="p-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition-colors cursor-pointer"
                  title="حذف هذا الاختبار"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button 
                  onClick={() => setPreviewTest(null)} 
                  className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit no-print">
              <button
                type="button"
                onClick={() => setModalTab('preview_sheet')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === 'preview_sheet'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>معاينة الورقة الذكية</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('print_preview')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === 'print_preview'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>معاينة الطباعة A4</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('edit')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  modalTab === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>تحرير الترتيب والأسئلة</span>
              </button>
            </div>

            {/* Final Save Toast or Order Changed Alert */}
            {finalSaveToast && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{finalSaveToast}</span>
              </div>
            )}

            {hasOrderChanged && !finalSaveToast && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs font-bold text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    تم تغيير ترتيب الأسئلة! الكود المقترح لهذا الترتيب هو: <strong className="font-mono text-indigo-700 dark:text-indigo-300">#{paperTestCode}</strong>. يرجى الضغط على زر <strong>"حفظ نهائي بالكود"</strong> لتثبيت الترتيب ومفتاح الإجابة.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveFinalWithCode}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shrink-0 cursor-pointer shadow-xs"
                >
                  حفظ نهائي الآن
                </button>
              </div>
            )}

            {/* SIMPLIFIED & STREAMLINED TEST SETTINGS PANEL (Direct 2-Card Layout) */}
            {isPaperSettingsOpen && (
              <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border-2 border-sky-300 dark:border-sky-800 shadow-md space-y-5 animate-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">إعدادات الاختبار وتخصيص ورقة الأسئلة</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">لوحة مبسطة وسريعة للتحكم في الطلاب وتنسيق الورقة والكود بدون تعقيد</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPaperSettingsOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>إغلاق الإعدادات</span>
                  </button>
                </div>

                {/* 2-Card Unified Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* CARD 1: STUDENT & CLASSROOM SELECTION */}
                  <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-sky-600" />
                        <span>1. اختيار الفصول والطلاب للطباعة</span>
                      </h5>
                      <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800">
                        {printModeTab === 'selected' ? `${selectedStudentIds.length} طالب محدد` : 'نموذج فارغ'}
                      </span>
                    </div>

                    {/* Mode Toggle */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black">
                      <button
                        type="button"
                        onClick={() => setPrintModeTab('selected')}
                        className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          printModeTab === 'selected'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>طباعة مخصصة بأسماء الطلاب</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintModeTab('manual')}
                        className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          printModeTab === 'manual'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>نموذج فارغ (كتابة يدوية)</span>
                      </button>
                    </div>

                    {printModeTab === 'selected' ? (
                      <div className="space-y-3">
                        {/* Quick Class Selection Chips */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-black text-slate-700 dark:text-slate-300">
                              اختر الفصول المراد طباعتها:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedClassroomKeys(uniqueClassesForPrinting.map(c => c.key))}
                                className="font-bold text-sky-600 hover:underline cursor-pointer"
                              >
                                تحديد الكل
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setSelectedClassroomKeys([])}
                                className="font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 custom-scrollbar">
                            {uniqueClassesForPrinting.length === 0 ? (
                              <div className="text-[10px] text-slate-400 italic">لا يوجد طلاب مسجلون حالياً</div>
                            ) : (
                              uniqueClassesForPrinting.map(cls => {
                                const isSelected = selectedClassroomKeys.includes(cls.key);
                                return (
                                  <button
                                    key={cls.key}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClassroomKeys(prev => 
                                        isSelected ? prev.filter(k => k !== cls.key) : [...prev, cls.key]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isSelected
                                        ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300'
                                    }`}
                                  >
                                    <span>فصل {cls.classroom}</span>
                                    <span className="opacity-70 text-[9px]">({GRADE_LABELS[cls.grade] || cls.grade})</span>
                                    <span className={`px-1 rounded-sm text-[9px] ${isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                      {cls.count}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Search & Actions Bar */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={studentSearchTerm}
                              onChange={e => setStudentSearchTerm(e.target.value)}
                              placeholder="بحث باسم الطالب داخل الفصول..."
                              className="w-full pr-3 pl-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 font-bold"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          </div>
                          <button
                            type="button"
                            onClick={handleSelectAllFiltered}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer shrink-0"
                            title="تحديد كافة الطلاب المتاحين"
                          >
                            تحديد الكل ({filteredStudents.length})
                          </button>
                          <button
                            type="button"
                            onClick={handleClearSelectedStudents}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                            title="مسح التحديد"
                          >
                            مسح
                          </button>
                        </div>

                        {/* Compact Student List */}
                        <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map(stu => {
                              const isSelected = selectedStudentIds.includes(stu.id);
                              return (
                                <label
                                  key={stu.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-400 text-sky-950 dark:text-sky-100 font-black'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleStudent(stu.id)}
                                    className="w-3.5 h-3.5 rounded text-sky-600 accent-sky-600"
                                  />
                                  <div className="truncate flex-1">
                                    <div className="truncate font-bold text-[11px]">{stu.fullName}</div>
                                    <div className="text-[9px] text-slate-400">
                                      {stu.classroom ? `فصل: ${stu.classroom}` : ''}
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          ) : (
                            <div className="col-span-full py-4 text-center text-xs text-slate-400">
                              لا يوجد طلاب مطابقون للفصول المحددة.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            اسم الطالب (اختياري - يترك فارغاً ليكتبه الطالب بنفسه):
                          </label>
                          <input
                            type="text"
                            value={paperStudentName}
                            onChange={e => setPaperStudentName(e.target.value)}
                            placeholder="اتركه فارغاً ليكتبه الطالب بيده..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            الصف الدراسي المطبوع في الترويسة:
                          </label>
                          <input
                            type="text"
                            value={paperStudentGrade}
                            onChange={e => setPaperStudentGrade(e.target.value)}
                            placeholder={previewTest.test.targetGrades.map(g => GRADE_LABELS[g]).join('، ') || 'الصف...'}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: PAPER FORMATTING, CODE & HEADER */}
                  <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Layout className="w-4 h-4 text-indigo-600" />
                      <span>2. تنسيق ورقة الاختبار وكود النموذج</span>
                    </h5>

                    {/* Columns & Sizing in 1 clean row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Columns */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">تقسيم الأعمدة:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewMinimalist(false)}
                            className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              !previewMinimalist
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-black shadow-xs ring-2 ring-indigo-500/20'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600'
                            }`}
                          >
                            عامود واحد
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewMinimalist(true)}
                            className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              previewMinimalist
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-black shadow-xs ring-2 ring-indigo-500/20'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600'
                            }`}
                          >
                            عامودين
                          </button>
                        </div>
                      </div>

                      {/* Quick Font Sizing */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">حجم الخط السريع:</label>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => { setPaperQuestionFontSize(12); setPaperOptionFontSize(10.5); }}
                            className={`py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                              paperQuestionFontSize <= 12
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-900 dark:text-sky-200 font-black shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600'
                            }`}
                          >
                            صغير
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPaperQuestionFontSize(14); setPaperOptionFontSize(12); }}
                            className={`py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                              paperQuestionFontSize > 12 && paperQuestionFontSize < 16
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-900 dark:text-sky-200 font-black shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600'
                            }`}
                          >
                            قياسي
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPaperQuestionFontSize(16); setPaperOptionFontSize(14); }}
                            className={`py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                              paperQuestionFontSize >= 16
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-900 dark:text-sky-200 font-black shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600'
                            }`}
                          >
                            كبير
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Test Code Section */}
                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Hash className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>كود الاختبار (معرف مفتاح الإجابة):</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newCode = `TEST-${Math.floor(10 + Math.random() * 90)}`;
                            setPaperTestCode(newCode);
                            syncPaperSettingsToModel({ code: newCode });
                          }}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          توليد كود تلقائي
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={paperTestCode}
                          onChange={e => setPaperTestCode(e.target.value.trim().toUpperCase())}
                          onBlur={e => syncPaperSettingsToModel({ code: e.target.value.trim().toUpperCase() })}
                          className="flex-1 px-3 py-1.5 text-xs font-mono font-black rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200 tracking-wider"
                          placeholder="TEST-01"
                        />
                        <button
                          type="button"
                          onClick={handleSaveFinalWithCode}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>حفظ الكود</span>
                        </button>
                      </div>
                    </div>

                    {/* Supervisor & Student Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 dark:text-slate-400">مشرف/منسق موهبة (بالترويسة):</label>
                        <input
                          type="text"
                          value={paperCoordinatorName}
                          onChange={e => setPaperCoordinatorName(e.target.value)}
                          placeholder="اسم المعلم أو المشرف..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 dark:text-slate-400">المستوى الدراسي:</label>
                        <select
                          value={paperStudentLevel}
                          onChange={e => {
                            const val = e.target.value;
                            setPaperStudentLevel(val);
                            syncPaperSettingsToModel({ levelLabel: val });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value="المستوى الأول">المستوى الأول (التهيئة)</option>
                          <option value="المستوى الثاني">المستوى الثاني (التميز)</option>
                          <option value="المستوى الثالث">المستوى الثالث (التقدم)</option>
                        </select>
                      </div>
                    </div>

                    {/* Repeats & Instructions in 1 compact row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600 dark:text-slate-400">أسئلة فحص الثبات:</label>
                        <select
                          value={paperRepeatCount}
                          onChange={e => setPaperRepeatCount(parseInt(e.target.value) as any)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value="0">بدون تكرار (41 سؤال)</option>
                          <option value="2">سؤالين مكررين (43 سؤال)</option>
                          <option value="3">3 أسئلة مكررة (44 سؤال - الحد الأقصى)</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5 gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paperShowInstructions}
                            onChange={e => setPaperShowInstructions(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 accent-sky-600"
                          />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            عرض تعليمات الاختبار
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ensureEvenPages}
                            onChange={e => setEnsureEvenPages(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 accent-sky-600"
                          />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            ضمان صفحات زوجية (وجه وظهر)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-500 font-bold">
                    💡 يمكنك دائماً حفظ كود النموذج وطباعة الاختبار أو معاينته في الأسفل مباشرة.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveFinalWithCode}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ الكود والترتيب</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintBooklet}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الاختبار الآن (PDF)</span>
                    </button>

                    <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <input 
                        type="checkbox"
                        checked={showAnswersInPrint}
                        onChange={e => setShowAnswersInPrint(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                      <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">طباعة النموذج محلول</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview Student Carousel Indicator */}
            {selectedStudents.length > 0 && (
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sky-900 dark:text-sky-200">
                    معاينة ورقة الطالب ({previewStudentIdx + 1} من {selectedStudents.length}):
                  </span>
                  <span className="font-black text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-sky-300 dark:border-sky-700 shadow-xs">
                    {currentPreviewStudent?.fullName} ({currentPreviewStudent?.classroom ? `فصل ${currentPreviewStudent.classroom}` : 'عام'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewStudentIdx(prev => Math.max(0, prev - 1))}
                    disabled={previewStudentIdx === 0}
                    className="px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>السابق</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewStudentIdx(prev => Math.min(selectedStudents.length - 1, prev + 1))}
                    disabled={previewStudentIdx >= selectedStudents.length - 1}
                    className="px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelectedStudents}
                    className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                    title="تفريغ التحديد ومعاينة ورقة فارغة"
                  >
                    معاينة نموذج فارغ
                  </button>
                </div>
              </div>
            )}

            {/* PRINT PREVIEW TAB: LIVE A4 PAGINATION */}
            {modalTab === 'print_preview' && (
              <div className="bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0 no-print" dir="rtl">
                <div className="max-w-[210mm] mx-auto space-y-8">
                  <div className="flex items-center justify-between mb-4 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-sm font-black">معاينة حية دقيقة لنظام صفحات A4</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                         {ensureEvenPages ? '✓ وضع الطباعة المزدوجة (وجه وظهر) مفعل' : 'وضع الطباعة العادية'}
                       </span>
                    </div>
                  </div>

                  {/* Simulated Paginated View for Current Preview Student */}
                  <div 
                    className="space-y-12"
                    style={{
                      fontFamily: getFontFamilyCss(paperFontFamily),
                    }}
                  >
                    {[0, 1].map((pageIdx) => (
                      <div key={pageIdx} className="space-y-6">
                        <div className="bg-white text-black shadow-2xl mx-auto w-full min-h-[297mm] p-[12mm] relative border border-slate-300 rounded-sm flex flex-col overflow-hidden">
                           {/* Page Content Simulator */}
                           {pageIdx === 0 ? (
                             <>
                               {/* Header */}
                               <div className="border-b-2 border-black pb-3 mb-6">
                                 <div className="flex items-center justify-between gap-3">
                                   <div className="text-right text-[10px] font-bold leading-tight">
                                     <div>المملكة العربية السعودية</div>
                                     <div>وزارة التعليم</div>
                                     <div className="font-black text-[11px] mt-1">{settings?.schoolName}</div>
                                   </div>
                                   <div className="text-center flex-1">
                                     <div className="text-[16px] font-black">{previewTest.test.title}</div>
                                     <div className="text-[10px] font-bold text-slate-500 mt-1">كود الاختبار: #{paperTestCode}</div>
                                   </div>
                                   <div className="text-left text-[10px] leading-tight font-bold">
                                     <div>الزمن: {previewTest.test.durationMinutes} دقيقة</div>
                                     <div>الأسئلة: {displayStructure.reduce((acc, g) => acc + g.questions.length, 0)}</div>
                                     <div>المستوى: {paperStudentLevel}</div>
                                   </div>
                                 </div>
                                 
                                 <div className="mt-4 pt-2 border-t border-black/20 flex items-center justify-between text-[12px] font-black bg-slate-50 px-3 py-2 rounded">
                                   <span>اسم الطالب: {currentPreviewStudent?.fullName || paperStudentName || '................................................'}</span>
                                   <span>الصف: {currentPreviewStudent?.grade ? GRADE_LABELS[currentPreviewStudent.grade as GradeLevel] : (paperStudentGrade || '................')}</span>
                                 </div>
                               </div>

                               {/* Simulated Questions on Page 1 */}
                               <div className={previewMinimalist ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
                                 {displayStructure[0].questions.slice(0, previewMinimalist ? 8 : 4).map((q, idx) => (
                                   <div key={q.id} className="border-2 border-slate-300 rounded-xl p-3 bg-white">
                                      <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-1">
                                        <span className="bg-black text-white px-2.5 py-0.5 rounded text-[10px] font-black">سؤال {idx + 1}</span>
                                        <span className="text-[9px] opacity-40 font-mono">#{q.code}</span>
                                      </div>
                                      <p className="font-bold mb-3 leading-relaxed text-[14px]">{q.questionText}</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {q.options.slice(0, 4).map((opt, oIdx) => (
                                          <div key={opt.id} className={`border border-slate-200 rounded-lg p-2 flex items-center gap-2 ${showAnswersInPrint && opt.id === q.correctOptionId ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20' : ''}`}>
                                            <OptionLetterBubble letter={['أ', 'ب', 'ج', 'د'][oIdx]} size={18} fontSize={10} />
                                            <span className="text-[11px] font-bold truncate">{opt.text}</span>
                                          </div>
                                        ))}
                                      </div>
                                   </div>
                                 ))}
                               </div>
                               
                               <div className="mt-auto pt-8 flex flex-col items-center">
                                  <div className="h-px w-32 bg-slate-200 mb-2"></div>
                                  <div className="text-[10px] text-slate-400 italic">يتبع في الصفحة التالية...</div>
                               </div>
                             </>
                           ) : (
                             <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-slate-50 rounded-[3rem]">
                                <Printer className="w-20 h-20 text-slate-100 mb-6" />
                                <div className="text-3xl font-black text-slate-200 mb-2">بقية الأسئلة...</div>
                                <p className="text-slate-300 font-bold">يتم توزيع {displayStructure.reduce((acc, g) => acc + g.questions.length, 0)} سؤالاً على الصفحات تلقائياً</p>
                             </div>
                           )}

                           {/* Footer - Page Numbering */}
                           <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] font-black text-slate-400">
                             <div className="flex items-center gap-1">
                               <SchoolLogo className="w-4 h-4 opacity-30" />
                               <span>{settings?.schoolName}</span>
                             </div>
                             <div className="bg-slate-50 px-6 py-1.5 rounded-full border border-slate-200 text-slate-600">صفحة رقم {pageIdx + 1}</div>
                             <span>منصة الإبداع لرعاية الموهوبين</span>
                           </div>
                        </div>

                        {/* Visual Break with Even Page Logic Indicator */}
                        {pageIdx === 1 && ensureEvenPages && (
                           <div className="space-y-4">
                             <div className="h-px bg-slate-300 dark:bg-slate-800 w-full relative my-8">
                               <div className="absolute left-1/2 -translate-x-1/2 -top-4 bg-amber-50 dark:bg-amber-950 px-6 py-2 rounded-full border-2 border-amber-200 dark:border-amber-800 text-[10px] font-black text-amber-700 dark:text-amber-300 flex items-center gap-2 shadow-sm">
                                 <AlertCircle className="w-4 h-4" />
                                 <span>سيتم إضافة ورقة بيضاء هنا إذا كان إجمالي الصفحات فردياً (للطباعة وجه وظهر)</span>
                               </div>
                             </div>
                             <div className="bg-slate-50/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center opacity-40">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <div className="text-xl font-black text-slate-300">ورقة بيضاء محتملة</div>
                             </div>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div 
              className="p-6 sm:p-8 bg-white text-black rounded-2xl border-2 border-slate-300 shadow-xl max-w-3xl mx-auto space-y-3.5" 
              dir="rtl"
              style={{
                fontFamily: getFontFamilyCss(paperFontFamily),
                fontSize: `${paperQuestionFontSize}px`
              }}
            >
              {/* Header */}
              <div className="border-b-2 border-black pb-2.5 mb-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Right: Ministry & School & Supervisor */}
                  <div className="text-right text-[11px] font-bold leading-tight text-black">
                    <div className="text-[10px] text-slate-700">المملكة العربية السعودية</div>
                    <div className="font-extrabold text-[10.5px]">وزارة التعليم</div>
                    <div className="font-black text-[11px] text-black border-b border-black/10 pb-0.5 mb-1">{settings?.schoolName || 'مدارس رياض الإبداع الأهلية'}</div>
                    <div className="text-[9px] font-bold text-slate-800">
                      {paperCoordinatorName ? `مشرف موهبة: ${paperCoordinatorName}` : 'مشرف موهبة: ................................'}
                    </div>
                  </div>

                  {/* Center: Exam Title ONLY (Clean & Elegant, NO level, NO model A) */}
                  <div className="text-center px-4 flex-1">
                    <div className="text-[15px] font-black text-black leading-snug tracking-wide">
                      {previewTest.test.title}
                    </div>
                  </div>

                  {/* Left: Metadata (Level, Duration, Test Code & Questions Count) */}
                  <div className="text-left text-[10px] font-bold leading-tight text-black min-w-[130px]">
                    {paperLevelPosition === 'sidebar' && (
                      <div className="flex justify-between gap-2 border-b border-black/10 pb-0.5 mb-0.5">
                        <span>المستوى:</span>
                        <span className="font-black text-black">{paperStudentLevel}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 border-b border-black/10 pb-0.5 mb-0.5">
                      <span>الزمن:</span>
                      <span className="font-black">{previewTest.test.durationMinutes} دقيقة</span>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-black/10 pb-0.5 mb-0.5">
                      <span>كود الاختبار:</span>
                      <span className="font-mono font-black text-indigo-700">#{paperTestCode}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>الأسئلة:</span>
                      <span className="font-black text-rose-600">{displayStructure.reduce((acc, g) => acc + g.questions.length, 0)} سؤال</span>
                    </div>
                  </div>
                </div>

                {/* Student Details Strip */}
                <div className="mt-2.5 pt-1.5 border-t border-black/40 flex items-center justify-between text-[11px] font-bold bg-slate-50 p-1.5 rounded text-black">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="shrink-0 text-[12px] font-black">اسم الطالب:</span>
                    <div className="flex-1 border-2 border-black bg-white px-3 py-1 rounded-lg font-black text-black min-h-[1.9rem] flex items-center text-sm shadow-xs">
                      {currentPreviewStudent ? (
                        currentPreviewStudent.fullName
                      ) : paperStudentName.trim() ? (
                        paperStudentName.trim()
                      ) : (
                        <span className="text-slate-400 font-mono tracking-wider text-xs">...........................................................................</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mr-3 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 border-r border-black/10">
                      <span className="opacity-70 text-[11px]">الصف:</span>
                      <span className="font-black text-black text-[12px]">
                        {currentPreviewStudent?.grade 
                          ? (GRADE_LABELS[currentPreviewStudent.grade] || '') 
                          : (paperStudentGrade.trim() || previewTest.test.targetGrades.map(g => GRADE_LABELS[g]).join('، '))}
                      </span>
                    </div>
                    {paperLevelPosition === 'student_strip' && (
                      <div className="flex items-center gap-1.5 px-3 border-r border-black/10">
                        <span className="opacity-70 text-[11px]">المستوى:</span>
                        <span className="font-black text-black text-[12px]">{paperStudentLevel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {paperShowInstructions && (
                  <div className="mt-1.5 p-1.5 bg-slate-100 rounded text-[10px] font-bold text-black leading-tight border border-slate-300">
                    📌 <strong>تعليمات الاختبار:</strong> {paperInstructionsText}
                  </div>
                )}
              </div>

              {/* Questions Grid with synchronized proportional font scaling */}
              <div className={previewMinimalist ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                {displayStructure.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {group.title && (
                      <div className={`${previewMinimalist ? 'col-span-2' : ''} flex items-center gap-2 mb-1.5 mt-3 first:mt-0`}>
                        <div className="bg-black text-white px-3 py-0.5 rounded-lg text-[10px] font-black">
                          القسم: {group.title}
                        </div>
                        <div className="h-px bg-slate-300 flex-1"></div>
                      </div>
                    )}
                    {group.questions.map((q, idx) => (
                      <div 
                        key={q.id} 
                        className={`question-print-item border-2 border-slate-300 rounded-xl bg-white text-black shadow-2xs ${
                          paperCompactSpacing ? 'p-2.5 mb-2' : 'p-3.5 mb-3'
                        }`}
                        style={{
                          breakBefore: q.isConsistencyCheck ? 'page' : 'auto',
                          pageBreakBefore: q.isConsistencyCheck ? 'always' : 'auto'
                        }}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 font-bold">
                          <div className="flex items-center gap-2">
                            <span 
                              className="bg-black text-white px-2.5 py-0.5 rounded-md font-black" 
                              style={{ fontSize: `${Math.max(9, Math.round(paperQuestionFontSize * 0.8))}px` }}
                            >
                              سؤال {idx + 1}
                            </span>
                            {/* Question Reorder Buttons in Screen Preview */}
                            <div className="flex items-center gap-1 no-print">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(idx, 'up')}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                  title="تقديم السؤال للأعلى في الترتيب"
                                >
                                  ▲ للأعلى
                                </button>
                              )}
                              {idx < group.questions.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(idx, 'down')}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                  title="تأخير السؤال للأسفل في الترتيب"
                                >
                                  ▼ للأسفل
                                </button>
                              )}
                            </div>
                          </div>
                          {q.isConsistencyCheck && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              (صفحة جديدة - تحقق الثبات)
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <p 
                          className="font-bold leading-relaxed mb-2 text-black" 
                          style={{ fontSize: `${paperQuestionFontSize}px` }}
                        >
                          {q.questionText}
                        </p>

                        {(q.svgGraphic || q.imageUrl) && (
                          <div className="py-2 flex justify-center bg-slate-50 rounded-lg mb-2 border border-slate-100" style={{ breakInside: 'avoid' }}>
                            {q.svgGraphic && <VisualShape type={q.svgGraphic} size={previewMinimalist ? 70 : 90} />}
                            {q.imageUrl && !q.svgGraphic && (
                              <img 
                                src={q.imageUrl} 
                                alt="شكل السؤال" 
                                referrerPolicy="no-referrer"
                                className="max-h-20 object-contain rounded" 
                              />
                            )}
                          </div>
                        )}

                        {/* Options Grid with synchronized proportional font size and centered letter bubbles */}
                        <div 
                          className="grid grid-cols-2 gap-2 pt-1" 
                          style={{ fontSize: `${paperOptionFontSize}px` }}
                        >
                          {q.options.map((opt, oIdx) => (
                            <div 
                              key={opt.id} 
                              className={`rounded-xl border flex items-center gap-2 text-black bg-white ${
                                showAnswersInPrint && opt.id === q.correctOptionId 
                                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' 
                                  : 'border-slate-300'
                              }`}
                              style={{ 
                                padding: `${Math.max(4, Math.round(paperOptionFontSize * 0.35))}px ${Math.max(6, Math.round(paperOptionFontSize * 0.5))}px`,
                                breakInside: 'avoid'
                              }}
                            >
                              <div className="relative shrink-0">
                                <OptionLetterBubble 
                                  letter={['أ', 'ب', 'ج', 'د'][oIdx]} 
                                  size={Math.max(20, Math.round(paperOptionFontSize * 1.7))} 
                                  fontSize={Math.max(9, Math.round(paperOptionFontSize * 0.85))} 
                                />
                                {showAnswersInPrint && opt.id === q.correctOptionId && (
                                  <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              {opt.text && (
                                <span 
                                  className="leading-snug font-bold text-black flex-1" 
                                  style={{ fontSize: `${paperOptionFontSize}px` }}
                                >
                                  {opt.text}
                                </span>
                              )}
                              {opt.imageUrl && (
                                <img 
                                  src={opt.imageUrl} 
                                  alt="" 
                                  className="max-h-12 max-w-[70px] object-contain rounded border border-slate-200 mr-auto" 
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[9px] font-mono text-slate-400">
                معاينة للعرض فقط | ID: {previewTest.model.id.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE BOOKLET (Pure Print Target) */}
      {previewTest && (
        <div 
          id="printable-test-booklet" 
          className="print-only w-full bg-white text-black p-0" 
          dir="rtl"
          style={{
            fontFamily: getFontFamilyCss(paperFontFamily),
            fontSize: `${paperQuestionFontSize}px`
          }}
        >
          {(selectedStudentIds.length > 0 
            ? students.filter(s => selectedStudentIds.includes(s.id)) 
            : [{ id: 'blank', fullName: paperStudentName || '................................................................', classroom: paperStudentSection || '....................' } as Student]
          ).map((student, sIdx, arr) => {
            const isLast = sIdx === arr.length - 1;
            const studentGradeLabel = student.grade 
              ? (GRADE_LABELS[student.grade as GradeLevel] || '') 
              : (paperStudentGrade.trim() || previewTest.test.targetGrades.map(g => GRADE_LABELS[g]).join('، '));

            return (
              <div 
                key={student.id + '-' + sIdx}
                className="student-exam-booklet w-full mb-8"
                style={{
                  pageBreakAfter: isLast ? 'avoid' : 'always',
                  breakAfter: isLast ? 'avoid' : 'page',
                }}
              >
                {/* Printable Header */}
                <div className="border-b-2 border-black pb-2 mb-2.5 print-avoid-break">
                  <div className="flex items-center justify-between gap-3">
                    {/* Right: Ministry & School & Coordinator */}
                    <div className="text-right text-[11px] font-bold leading-tight text-black">
                      <div className="text-[10px] text-slate-700">المملكة العربية السعودية</div>
                      <div className="font-extrabold text-[10.5px]">وزارة التعليم</div>
                      <div className="font-black text-[11px] text-black border-b border-black/10 pb-0.5 mb-1">{settings?.schoolName || 'مدارس رياض الإبداع الأهلية'}</div>
                      <div className="text-[9px] font-bold text-slate-800">
                        {paperCoordinatorName ? `مشرف موهبة: ${paperCoordinatorName}` : 'مشرف موهبة: ................................'}
                      </div>
                    </div>

                    {/* Center: Title ONLY (Clean & Elegant, NO level, NO model A) */}
                    <div className="text-center px-4 flex-1">
                      <div className="text-[14px] font-black text-black leading-snug tracking-wide">
                        {previewTest.test.title}
                      </div>
                    </div>

                    {/* Left: Metadata (Level, Duration, Code & Questions) */}
                    <div className="text-left text-[10px] font-bold leading-tight text-black min-w-[125px]">
                      {paperLevelPosition === 'sidebar' && (
                        <div className="flex justify-between gap-2 border-b border-black/5 pb-0.5 mb-0.5">
                          <span>المستوى:</span>
                          <span className="font-black text-black">{paperStudentLevel}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2 border-b border-black/5 pb-0.5 mb-0.5">
                        <span>الزمن:</span>
                        <span className="font-black">{previewTest.test.durationMinutes} د</span>
                      </div>
                      <div className="flex justify-between gap-2 border-b border-black/5 pb-0.5 mb-0.5">
                        <span>كود الاختبار:</span>
                        <span className="font-mono font-black text-slate-800">#{paperTestCode}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>الأسئلة:</span>
                        <span className="font-black text-rose-600">{displayStructure.reduce((acc, g) => acc + g.questions.length, 0)} سؤال</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Details Strip */}
                  <div className="mt-2 pt-1 border-t border-black/50 flex items-center justify-between text-[11px] font-bold bg-slate-50 p-1 rounded text-black">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="shrink-0 text-[12px] font-black">اسم الطالب:</span>
                      <div className="flex-1 border-2 border-black bg-white px-3 py-1 rounded-lg font-black text-black min-h-[1.8rem] flex items-center text-sm shadow-xs">
                        {student.fullName?.trim() || ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mr-3 shrink-0">
                      {studentGradeLabel && (
                        <div className="flex items-center gap-1.5 px-3 border-r border-black/10">
                          <span className="opacity-70 text-[11px]">الصف:</span>
                          <span className="font-black text-[12px]">{studentGradeLabel}</span>
                        </div>
                      )}
                      {paperLevelPosition === 'student_strip' && (
                        <div className="flex items-center gap-1.5 px-3 border-r border-black/10">
                          <span className="opacity-70 text-[11px]">المستوى:</span>
                          <span className="font-black text-[12px]">{paperStudentLevel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {paperShowInstructions && (
                    <div className="mt-1.5 p-1.5 bg-slate-100 rounded text-[10px] font-bold text-black leading-tight border border-slate-300">
                      📌 <strong>تعليمات الاختبار:</strong> {paperInstructionsText}
                    </div>
                  )}
                </div>

                {/* Printable Questions Grid */}
                <div className={previewMinimalist ? 'print-columns-2' : 'print-columns-1 space-y-2'}>
                  {displayStructure.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {group.title && (
                        <div className="space-y-2 mb-1.5 mt-3 first:mt-0 print-avoid-break" style={{ gridColumn: 'span 2' }}>
                          <div className="flex items-center gap-2 mb-1">
                             <div className="bg-black text-white px-2 py-0.5 rounded text-[9.5px] font-black">القسم: {group.title}</div>
                             <div className="h-[1px] bg-black/10 flex-1"></div>
                          </div>
                        </div>
                      )}
                      {group.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className={`question-print-item print-avoid-break border-2 border-slate-500 rounded-lg bg-white text-black ${paperCompactSpacing ? 'p-2 mb-1.5' : 'p-2.5 mb-2.5'}`}
                          style={{
                            breakInside: 'avoid',
                            pageBreakInside: 'avoid',
                            fontFamily: getFontFamilyCss(paperFontFamily),
                            fontSize: `${paperQuestionFontSize}px`,
                            breakBefore: q.isConsistencyCheck ? 'page' : 'auto',
                            pageBreakBefore: q.isConsistencyCheck ? 'always' : 'auto'
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1 font-bold">
                            <span 
                              className="bg-black text-white px-2 py-0.5 rounded font-black"
                              style={{ fontSize: `${Math.max(9, Math.round(paperQuestionFontSize * 0.8))}px` }}
                            >
                              سؤال {idx + 1}
                            </span>
                            {q.isConsistencyCheck && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                (صفحة جديدة - تحقق الثبات)
                              </span>
                            )}
                          </div>
                          
                          <p 
                            className="font-bold leading-snug mb-1 text-black"
                            style={{ fontSize: `${paperQuestionFontSize}px` }}
                          >
                            {q.questionText}
                          </p>

                          {(q.svgGraphic || q.imageUrl) && (
                            <div className="py-1 flex justify-center bg-slate-50 rounded mb-1" style={{ breakInside: 'avoid' }}>
                              {q.svgGraphic && <VisualShape type={q.svgGraphic} size={previewMinimalist ? 70 : 85} />}
                              {q.imageUrl && !q.svgGraphic && <img src={q.imageUrl} alt="شكل السؤال" className="max-h-16 object-contain rounded" />}
                            </div>
                          )}

                          <div 
                            className="grid grid-cols-2 gap-1.5 pt-0.5"
                            style={{ fontSize: `${paperOptionFontSize}px` }}
                          >
                            {q.options.map((opt, oIdx) => (
                              <div 
                                key={opt.id} 
                                className={`rounded border flex items-center gap-1.5 text-black ${
                                  showAnswersInPrint && opt.id === q.correctOptionId 
                                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/10' 
                                    : 'border-slate-400'
                                }`} 
                                style={{ 
                                  breakInside: 'avoid',
                                  padding: `${Math.max(4, Math.round(paperOptionFontSize * 0.35))}px ${Math.max(5, Math.round(paperOptionFontSize * 0.5))}px`
                                }}
                              >
                                <div className="relative">
                                  <OptionLetterBubble 
                                    letter={['أ', 'ب', 'ج', 'د'][oIdx]} 
                                    size={Math.max(19, Math.round(paperOptionFontSize * 1.65))} 
                                    fontSize={Math.max(8.5, Math.round(paperOptionFontSize * 0.85))} 
                                  />
                                  {showAnswersInPrint && opt.id === q.correctOptionId && (
                                    <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow-sm print-include">
                                      <Check className="w-2 h-2 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 flex flex-col gap-1 min-w-0">
                                  {opt.text && (
                                    <span 
                                      className="leading-tight font-bold text-black"
                                      style={{ fontSize: `${paperOptionFontSize}px` }}
                                    >
                                      {opt.text}
                                    </span>
                                  )}
                                  {opt.imageUrl && (
                                    <img 
                                      src={opt.imageUrl} 
                                      alt="" 
                                      className="max-h-12 max-w-[80px] object-contain rounded border border-slate-200" 
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                </div>
                                {opt.svgShape && (
                                  <div className="mr-auto shrink-0 scale-75 origin-right">
                                    <VisualShape type={opt.svgShape} size={30} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-2 text-center text-[8px] font-mono text-slate-400">ID: {previewTest.model.id.slice(-8).toUpperCase()} | Page {sIdx + 1}</div>

                {/* Even Page Logic: Add a blank page if this student's booklet ends on an odd page */}
                {ensureEvenPages && (
                  <div className="print-only blank-page no-screen">
                    <div className="flex flex-col items-center gap-2">
                       <FileText className="w-12 h-12 text-slate-100 mb-2" />
                       <span>ورقة بيضاء (للطباعة وجه وظهر)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal - Rendered cleanly outside previewTest */}
      {testToDelete && (
        <DeleteConfirmationModal
          test={testToDelete}
          onConfirm={() => {
            onDeleteTest(testToDelete.id);
            if (previewTest?.test.id === testToDelete.id) {
              setPreviewTest(null);
            }
            setTestToDelete(null);
          }}
          onCancel={() => setTestToDelete(null)}
        />
      )}
    </>
  );
};

/* --- DELETE CONFIRMATION MODAL --- */
const DeleteConfirmationModal: React.FC<{
  test: Test;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ test, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto shadow-inner ring-4 ring-rose-50 dark:ring-rose-900/20">
            <Trash2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              تأكيد حذف الاختبار
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف اختبار: <br/>
              <strong className="text-slate-900 dark:text-white font-black text-base">"{test.title}"</strong>؟
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed text-right space-y-2">
          <div className="font-black flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>تنبيه هام جداً:</span>
          </div>
          <p>سيتم حذف كافة النماذج والبيانات المرتبطة بهذا الاختبار نهائياً من قاعدة البيانات.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            تأكيد الحذف النهائي
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-4 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer"
          >
            إلغاء العملية
          </button>
        </div>
      </div>
    </div>
  );
};
