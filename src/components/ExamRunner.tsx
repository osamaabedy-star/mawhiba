import React, { useState, useEffect, useMemo } from 'react';
import { 
  Student, 
  Test, 
  TestModel, 
  Question, 
  ExamSubmission, 
  AppSettings,
  GradeLevel,
  GRADE_LABELS
} from '../types';
import { evaluateExamSubmission } from '../services/storage';
import { generateBalancedStudentQuestions, shuffleArray } from '../utils/examGenerator';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Flag, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Award,
  ShieldAlert,
  GraduationCap,
  Search,
  UserCheck,
  RotateCcw,
  BookOpen,
  HelpCircle,
  LayoutGrid,
  LogOut,
  ChevronLeft,
  X
} from 'lucide-react';
import { VisualShape } from './VisualShape';
import { SchoolLogo } from './SchoolLogo';
import { Brain } from 'lucide-react';

interface ExamRunnerProps {
  currentStudent: Student | null;
  students: Student[];
  tests: Test[];
  questions: Question[];
  settings: AppSettings;
  preselectedTestId?: string;
  preselectedModelId?: string;
  onFinishExam: (submission: ExamSubmission) => void;
  onExitExam: () => void;
  onResetStudentTest?: (studentId: string) => void;
}

type ExamStep = 'login_stage' | 'login_grade' | 'login_class' | 'login_students' | 'instructions' | 'taking' | 'submitted';

type StageType = 'primary' | 'middle';

const STAGES: { id: StageType; label: string; icon: string; description: string }[] = [
  { id: 'primary', label: 'المرحلة الابتدائية', icon: '🎒', description: 'اختبارات الكشف للمرحلة الابتدائية' },
  { id: 'middle', label: 'المرحلة المتوسطة', icon: '🎓', description: 'اختبارات الكشف للمرحلة المتوسطة' },
];

const PRIMARY_GRADES: { id: GradeLevel; label: string }[] = [
  { id: 'g3_primary', label: 'الصف الثالث الابتدائي' },
  { id: 'g4_primary', label: 'الصف الرابع الابتدائي' },
  { id: 'g5_primary', label: 'الصف الخامس الابتدائي' },
  { id: 'g6_primary', label: 'الصف السادس الابتدائي' },
];

const MIDDLE_GRADES: { id: GradeLevel; label: string }[] = [
  { id: 'g1_middle', label: 'الصف الأول المتوسط' },
  { id: 'g2_middle', label: 'الصف الثاني المتوسط' },
  { id: 'g3_middle', label: 'الصف الثالث المتوسط' },
];

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  currentStudent,
  students,
  tests,
  questions,
  settings,
  preselectedTestId,
  preselectedModelId,
  onFinishExam,
  onExitExam,
  onResetStudentTest,
}) => {
  // Student selection state
  const [activeStudent, setActiveStudent] = useState<Student | null>(currentStudent);
  const [selectedStage, setSelectedStage] = useState<StageType | null>(null);

  const availableGrades = selectedStage === 'primary' ? PRIMARY_GRADES : MIDDLE_GRADES;

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showManualNameEntry, setShowManualNameEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualClassroom, setManualClassroom] = useState('');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);

  // Selected Test and Model
  const [selectedTestId, setSelectedTestId] = useState<string>(
    preselectedTestId || currentStudent?.assignedTestId || tests[0]?.id || ''
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(preselectedModelId || '');

  // Exam Stage
  const [step, setStep] = useState<ExamStep>(() => {
    if (currentStudent) return 'instructions';
    return 'login_stage';
  });

  // Test Taking State
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800); // 30 mins
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showQuestionsGridModal, setShowQuestionsGridModal] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState<ExamSubmission | null>(null);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const activeModel: TestModel = 
    activeTest?.models.find(m => m.id === selectedModelId) || activeTest?.models[0];

  // Current question
  const currentQ = examQuestions[currentQuestionIndex];

  const prepareExamQuestions = (student: Student | null): Question[] => {
    // If a specific model was pre-selected (e.g. from Test Builder), respect its manual questions
    if (preselectedModelId && activeModel && activeModel.questionIds.length > 0) {
      return activeModel.questionIds
        .map(id => questions.find(q => q.id === id))
        .filter((q): q is Question => q !== undefined);
    }

    const studentGrade = (student?.grade as GradeLevel) || 
      (student?.gradeLevel as GradeLevel) || 
      selectedGrade || 
      'g3_primary';

    const targetCount = (settings.questionCounts || {})[studentGrade] || 30;

    // Generate balanced questions based on settings
    const balancedQuestions = generateBalancedStudentQuestions(questions, studentGrade, targetCount);
    return balancedQuestions;
  };

  // Sync activeStudent if currentStudent prop changes
  useEffect(() => {
    if (currentStudent) {
      setActiveStudent(currentStudent);
      const sGrade = (currentStudent.grade as GradeLevel) || (currentStudent.gradeLevel as GradeLevel);
      if (sGrade) {
        setSelectedGrade(sGrade);
        setSelectedStage(sGrade.includes('middle') ? 'middle' : 'primary');
        
        // Find best matching test for this grade
        const matchingTest = tests.find(t => t.targetGrades.includes(sGrade));
        if (matchingTest) {
          setSelectedTestId(matchingTest.id);
          setSelectedModelId(matchingTest.models[0]?.id || '');
        }
      }
      setStep('instructions');
    }
  }, [currentStudent, tests]);

  // Countdown Timer during 'taking' state
  useEffect(() => {
    if (step !== 'taking') return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTestAuto();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpentSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Available classrooms for current grade
  const availableClassrooms = useMemo(() => {
    if (!selectedGrade) return [];
    const classSet = new Set<string>();
    students.forEach(s => {
      const g = (s.grade as GradeLevel) || (s.gradeLevel as GradeLevel);
      if (g === selectedGrade && s.classroom) {
        classSet.add(s.classroom.trim());
      }
    });
    return Array.from(classSet).sort();
  }, [students, selectedGrade]);

  // Filter students for the selected stage, grade and classroom
  const gradeStudents = useMemo(() => {
    if (!selectedGrade || !selectedClassroom) return [];
    return students.filter(s => {
      const g = (s.grade as GradeLevel) || (s.gradeLevel as GradeLevel);
      const matchesGrade = g === selectedGrade;
      if (!matchesGrade) return false;
      
      const matchesClass = selectedClassroom === 'all' || s.classroom?.trim() === selectedClassroom.trim();
      if (!matchesClass) return false;

      if (!studentSearchQuery.trim()) return true;
      return s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase());
    });
  }, [students, selectedGrade, selectedClassroom, studentSearchQuery]);

  // Handle stage change
  const handleSelectStage = (stage: StageType) => {
    setSelectedStage(stage);
    setSelectedGrade(null);
    setSelectedClassroom(null);
    setStep('login_grade');
  };

  // Handle grade change
  const handleSelectGrade = (grade: GradeLevel) => {
    setSelectedGrade(grade);
    setSelectedClassroom(null);
    setStep('login_class');
  };

  // Handle classroom change
  const handleSelectClassroom = (classroom: string) => {
    setSelectedClassroom(classroom);
    setStep('login_students');
  };

  // Retake exam directly for active student
  const handleRetakeActiveStudentExam = () => {
    if (!activeStudent) return;
    if (onResetStudentTest) {
      onResetStudentTest(activeStudent.id);
    }
    const newQuestions = prepareExamQuestions(activeStudent);
    setExamQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFlaggedQuestions({});
    setSecondsRemaining(1800);
    setTimeSpentSeconds(0);
    setFinalSubmission(null);
    setStep('instructions');
  };

  // Direct start of exam for selected student
  const handleDirectStartExam = (student: Student) => {
    setActiveStudent(student);
    const sGrade = (student.grade as GradeLevel) || (student.gradeLevel as GradeLevel) || selectedGrade;
    if (sGrade) setSelectedGrade(sGrade);

    const preparedQuestions = prepareExamQuestions(student);
    if (!preparedQuestions || preparedQuestions.length === 0) {
      alert('عذراً، بنك الأسئلة لا يحتوي على أسئلة كافية لهذا الصف حالياً.');
      return;
    }

    setExamQuestions(preparedQuestions);
    setStep('taking');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFlaggedQuestions({});
    setSecondsRemaining(1800);
    setTimeSpentSeconds(0);
  };

  // Handle manual guest or unregistered student entry
  const handleManualStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const newStudent: Student = {
      id: `stu_quick_${Date.now()}`,
      fullName: manualName.trim(),
      studentNumber: `STU-${Date.now().toString().slice(-4)}`,
      internalStudentId: `STU-${Date.now().toString().slice(-4)}`,
      grade: selectedGrade || 'g3_primary',
      gradeLevel: selectedGrade || 'g3_primary',
      classroom: manualClassroom.trim() || (selectedClassroom && selectedClassroom !== 'all' ? selectedClassroom : 'عام'),
      gender: 'male',
      status: 'active',
    };

    handleDirectStartExam(newStudent);
  };

  // Start Test with 30 randomized balanced questions
  const handleStartExam = () => {
    const preparedQuestions = prepareExamQuestions(activeStudent);
    if (!preparedQuestions || preparedQuestions.length === 0) {
      alert('عذراً، بنك الأسئلة فارغ لهذا الصف.');
      return;
    }

    setExamQuestions(preparedQuestions);
    setStep('taking');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFlaggedQuestions({});
    setSecondsRemaining(1800); // 30 minutes for 30 questions
    setTimeSpentSeconds(0);
  };

  // Select Option
  const handleSelectOption = (optionId: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  // Toggle Flag
  const toggleFlag = () => {
    if (!currentQ) return;
    setFlaggedQuestions(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // Submit test
  const executeSubmission = () => {
    if (!activeStudent || !activeTest) return;

    const submission = evaluateExamSubmission({
      studentId: activeStudent.id,
      test: activeTest,
      modelId: activeModel?.id || 'mod_1',
      questions: examQuestions,
      customQuestions: examQuestions,
      studentAnswers: answers,
      timeSpentSeconds,
      minScoreForNomination: settings.minScoreForNomination,
      minHighSkillsForNomination: settings.minHighSkillsForNomination,
    });

    setFinalSubmission(submission);
    onFinishExam(submission);
    setShowConfirmSubmit(false);
    setStep('submitted');
  };

  const handleSubmitTestAuto = () => {
    executeSubmission();
  };

  // Helper for back button in login flow
  const handleLoginBack = () => {
    if (step === 'login_grade') setStep('login_stage');
    else if (step === 'login_class') setStep('login_grade');
    else if (step === 'login_students') setStep('login_class');
  };

  // =========================================================================
  // 1. LOGIN FLOW SCREENS
  // =========================================================================

  // PERSISTENT TOP NAV FOR LOGIN FLOW
  const LoginNavbar = () => (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs no-print shrink-0 mb-6">
      <div className="flex items-center gap-3">
        {(['login_grade', 'login_class', 'login_students'] as ExamStep[]).includes(step) && (
          <button
            onClick={handleLoginBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
        <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
          <SchoolLogo size={32} />
        </div>
        <div className="hidden xs:block text-right">
          <h2 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
            {settings.platformName}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold">
            {settings.schoolName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onExitExam}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>إنهاء وخروج</span>
        </button>
      </div>
    </div>
  );

  if (step === 'login_stage') {
    return (
      <div className="max-w-4xl mx-auto py-4 px-4 h-full flex flex-col items-center justify-center min-h-[70vh]">
        <LoginNavbar />
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">بوابة دخول الطلاب</h1>
            <p className="text-sm text-slate-500 font-bold">يرجى اختيار المرحلة التعليمية للبدء</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {STAGES.map(stage => (
              <button
                key={stage.id}
                onClick={() => handleSelectStage(stage.id)}
                className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 hover:shadow-xl transition-all group cursor-pointer"
              >
                <div className="text-6xl group-hover:scale-110 transition-transform">{stage.icon}</div>
                <div className="text-center">
                  <div className="text-xl font-black text-slate-900 dark:text-white mb-1">{stage.label}</div>
                  <div className="text-xs text-slate-500 font-medium">{stage.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'login_grade') {
    return (
      <div className="max-w-4xl mx-auto py-4 px-4 h-full flex flex-col min-h-[70vh]">
        <LoginNavbar />
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{selectedStage === 'primary' ? 'المرحلة الابتدائية' : 'المرحلة المتوسطة'}</h1>
            <p className="text-sm text-slate-500 font-bold">اختر الصف الدراسي</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableGrades.map(grade => (
              <button
                key={grade.id}
                onClick={() => handleSelectGrade(grade.id)}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-center font-black text-lg text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                {grade.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'login_class') {
    return (
      <div className="max-w-4xl mx-auto py-4 px-4 h-full flex flex-col min-h-[70vh]">
        <LoginNavbar />
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {availableGrades.find(g => g.id === selectedGrade)?.label}
            </h1>
            <p className="text-sm text-slate-500 font-bold">اختر الفصل الدراسي</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleSelectClassroom('all')}
              className="p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-center font-black text-lg text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              كافة الفصول
            </button>
            {availableClassrooms.map(cRoom => (
              <button
                key={cRoom}
                onClick={() => handleSelectClassroom(cRoom)}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-center font-black text-lg text-slate-900 dark:text-white transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                فصل {cRoom}
              </button>
            ))}
          </div>

          {availableClassrooms.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic">
              لا توجد فصول مسجلة حالياً لهذا الصف. يمكنك استخدام الدخول السريع أدناه.
            </div>
          )}

          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowManualNameEntry(!showManualNameEntry)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-extrabold cursor-pointer"
            >
              {showManualNameEntry ? 'إلغاء' : 'تريد الدخول السريع؟ اضغط هنا'}
            </button>
          </div>

          {showManualNameEntry && (
            <form onSubmit={handleManualStudentSubmit} className="max-w-md mx-auto p-6 rounded-3xl bg-sky-50 dark:bg-sky-900/10 border-2 border-sky-100 dark:border-sky-900 space-y-4 animate-in fade-in zoom-in-95">
               <div className="space-y-3">
                <input
                  type="text"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="اسمك الكامل..."
                  required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <input
                  type="text"
                  value={manualClassroom}
                  onChange={e => setManualClassroom(e.target.value)}
                  placeholder="الفصل (مثال: 3/أ)..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white text-sm font-black rounded-xl shadow-lg shadow-sky-600/20 transition-all">
                دخول سريع
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (step === 'login_students') {
    return (
      <div className="max-w-6xl mx-auto py-4 px-4 h-full flex flex-col min-h-[70vh]">
        <LoginNavbar />
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                قائمة طلاب فصل {selectedClassroom === 'all' ? 'الكل' : selectedClassroom}
              </h1>
              <p className="text-sm text-slate-500 font-bold">اضغط على اسمك لتبدأ الاختبار</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                placeholder="بحث عن اسم..."
                className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {gradeStudents.length > 0 ? (
              gradeStudents.map(student => {
                const isCompleted = student.status === 'completed';
                return (
                  <button
                    key={student.id}
                    onClick={() => {
                      if (isCompleted) {
                        if (confirm(`لقد أتم الطالب "${student.fullName}" الاختبار مسبقاً.\n\nهل ترغب في بدء إعادة الاختبار الآن؟`)) {
                          handleDirectStartExam(student);
                        }
                      } else {
                        handleDirectStartExam(student);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all text-center aspect-square group relative cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-50/40 dark:bg-slate-800/80 border-emerald-300 dark:border-emerald-800/70 hover:border-emerald-500 hover:shadow-xl'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-sky-500 hover:shadow-xl'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 group-hover:bg-sky-600 group-hover:text-white'}`}>
                      {isCompleted ? <RotateCcw className="w-7 h-7" /> : <UserCheck className="w-7 h-7" />}
                    </div>
                    <h4 className="text-[12px] font-black leading-tight line-clamp-2 px-1 text-slate-900 dark:text-white">
                      {student.fullName}
                    </h4>
                    {isCompleted && (
                      <div className="absolute top-2 right-2">
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full p-20 text-center text-slate-400 text-lg italic bg-slate-50 dark:bg-slate-800/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                لا يوجد طلاب حالياً في هذا الفصل
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. STEP: STUDENT CONFIRMATION & INSTRUCTIONS
  // =========================================================================
  if (step === 'instructions') {
    const studentGradeName = activeStudent?.grade ? GRADE_LABELS[activeStudent.grade as GradeLevel] : (selectedGrade ? GRADE_LABELS[selectedGrade] : '');

    return (
      <div className="max-w-4xl mx-auto py-2 sm:py-4 px-3 sm:px-4 space-y-4">
        {/* Persistent Student Navbar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
              <SchoolLogo size={32} />
            </div>
            <div className="hidden xs:block text-right">
              <h2 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {settings.platformName}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold">
                {settings.schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900">
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                {activeStudent?.fullName}
              </span>
            </div>

            <button
              onClick={onExitExam}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>إنهاء وخروج</span>
            </button>
          </div>
        </div>

        <div className="max-w-xl mx-auto py-2 sm:py-6 space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            {/* Welcome Card */}
            <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              مرحباً بك يا بطل: {activeStudent?.fullName}
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-100 dark:border-sky-900">
              <span>{studentGradeName}</span>
              {activeStudent?.classroom && (
                <>
                  <span>•</span>
                  <span>فصل {activeStudent.classroom}</span>
                </>
              )}
            </div>
          </div>

          {/* Test Specs Highlights */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">عدد الأسئلة</span>
              <span className="text-base font-extrabold text-sky-600 dark:text-sky-400">30 سؤالاً</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">مستوى الأسئلة</span>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">متنوع الصعوبة</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">ترتيب الأسئلة</span>
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">عشوائي كامل</span>
            </div>
          </div>

          {/* Simple Instructions */}
          <div className="bg-sky-50/60 dark:bg-sky-950/30 p-4 rounded-2xl border border-sky-100 dark:border-sky-900 text-xs text-sky-950 dark:text-sky-200 space-y-2 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
              <BookOpen className="w-4 h-4" />
              <span>إرشادات الاختبار السريعة:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[12px] text-slate-700 dark:text-slate-300">
              <li>كل سؤال يظهر كاملاً في الشاشة مع خيارات الإجابة دون حاجة للنزول.</li>
              <li>الأسئلة منوعة بين السهل والمتوسط والصعب لقياس التفكير الإبداعي.</li>
              <li>يمكنك التنقل بين الأسئلة بحرية وتعديل إجابتك قبل التسليم النهائي.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleStartExam}
              className="w-full sm:flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>ابدأ الاختبار الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setActiveStudent(null);
                setStep('login_stage');
              }}
              className="w-full sm:w-auto px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              اختيار طالب آخر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

  // =========================================================================
  // 3. STEP: SUBMITTED RESULTS - ONLY SCORE AND SIMPLIFIED ANALYSIS
  // =========================================================================
  if (step === 'submitted' && finalSubmission) {
    return (
      <div className="max-w-4xl mx-auto py-2 sm:py-4 px-3 sm:px-4 space-y-4">
        {/* Persistent Student Navbar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
              <SchoolLogo size={32} />
            </div>
            <div className="hidden xs:block text-right">
              <h2 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {settings.platformName}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold">
                {settings.schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExitExam}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>إنهاء وخروج</span>
            </button>
          </div>
        </div>

        <div className="max-w-xl mx-auto py-2 sm:py-6 space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Award className="w-8 h-8" />
            </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              تم تسليم الاختبار بنجاح
            </h2>
            <p className="text-xs text-slate-500">
              {activeStudent?.fullName} – {activeStudent?.classroom || (selectedGrade ? GRADE_LABELS[selectedGrade] : '')}
            </p>
          </div>

          {/* Result card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">الدرجة المحققة:</span>
              <span className="text-2xl font-black text-sky-700 dark:text-sky-300">
                {finalSubmission.totalScore} من {finalSubmission.maxScore}
              </span>
            </div>
            <div className="text-left">
              <span className="text-3xl font-black text-sky-600 dark:text-sky-400">
                {finalSubmission.percentage}%
              </span>
              <span className="text-[11px] text-slate-500 block font-medium">النسبة المئوية</span>
            </div>
          </div>

          {/* Simplified Analysis (مجالات التميز والاستعداد الذهني + نمط التفكير) */}
          <div className="space-y-2.5 text-right">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>التحليل المبسط للأداء:</span>
            </h4>

            {/* Strengths */}
            {finalSubmission.strengths.length > 0 && (
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 text-xs space-y-1">
                <span className="font-bold text-sky-900 dark:text-sky-200 block text-[11px]">
                  مجالات التميز والاستعداد الذهني:
                </span>
                <p className="text-sky-800 dark:text-sky-300 text-xs">
                  {finalSubmission.strengths.join('، ')}
                </p>
              </div>
            )}

            {/* Thinking Style & Deliberation */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-xs space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px]">
                نمط التفكير ومستوى التأمل:
              </span>
              <p className="text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
                {finalSubmission.consistencyAnalysis?.behaviorDescription || 'أظهرت تفكيراً متأنياً ومتوازناً واستجابة مدروسة للأسئلة.'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col items-center gap-2.5">
            <button
              onClick={() => {
                setStep('login_stage');
                setActiveStudent(null);
                setFinalSubmission(null);
                // Keep selectedStage, selectedGrade, and selectedClassroom to facilitate next student
              }}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-sky-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>العودة لاختيار طالب آخر</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

  // =========================================================================
  // 4. STEP: ACTIVE TEST TAKING (FITS 100% IN VIEWPORT - ZERO SCROLLING)
  // =========================================================================
  if (!currentQ) {
    return <div className="p-8 text-center text-xs">جاري تجهيز الأسئلة...</div>;
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / examQuestions.length) * 100);
  const isTimeCritical = secondsRemaining <= 180; // 3 mins or less
  const isCurrentFlagged = flaggedQuestions[currentQ.id];

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4 px-3 sm:px-4 space-y-3 h-full flex flex-col">
      {/* Persistent Student Navbar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs no-print shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
            <SchoolLogo size={32} />
          </div>
          <div className="hidden xs:block text-right">
            <h2 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
              {settings.platformName}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold">
              {settings.schoolName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
              {activeStudent?.fullName}
            </span>
          </div>

          <button
            onClick={() => setShowExitConfirmModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>إنهاء وخروج</span>
          </button>
        </div>
      </div>

      {/* 
        Container strictly sized to fit the screen without requiring up/down scroll:
        height capped at viewport minus navbars, with inner flex layout 
      */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3.5 sm:p-4.5 flex flex-col justify-between h-[calc(100vh-10rem)] min-h-[500px] max-h-[760px]">
        
        {/* ========================================================== */}
        {/* A. SLIM COMPACT TOP HEADER BAR (~44px)                     */}
        {/* ========================================================== */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700 shrink-0">
          {/* Right: Student & Question Number */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-lg bg-sky-600 text-white font-mono font-bold text-xs shrink-0">
              {currentQuestionIndex + 1} / {examQuestions.length}
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                {activeStudent?.fullName}
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                {activeStudent?.classroom || 'طالب'}
              </span>
            </div>
          </div>

          {/* Center: Progress & Flag Button */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={toggleFlag}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                isCurrentFlagged
                  ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <Flag className={`w-3 h-3 ${isCurrentFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="text-[11px]">{isCurrentFlagged ? 'مُميز للمراجعة' : 'تمييز للمراجعة'}</span>
            </button>

            {/* Questions Grid Popover Toggle */}
            <button
              onClick={() => setShowQuestionsGridModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer"
            >
              <LayoutGrid className="w-3 h-3 text-sky-600" />
              <span>شبكة الأسئلة ({answeredCount}/{examQuestions.length})</span>
            </button>
          </div>

          {/* Left: Countdown Timer & Quick Submit */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${
              isTimeCritical
                ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isTimeCritical ? 'text-rose-500' : 'text-sky-600'}`} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              تسليم
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/* B. MAIN QUESTION CARD (Question Text + Graphic + 2x2 Grid) */}
        {/* ========================================================== */}
        <div className="flex-1 flex flex-col justify-center py-2 sm:py-3 min-h-0 space-y-2.5 sm:space-y-3">
          
          {/* Question Text & Badges */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded">
                سؤال {currentQuestionIndex + 1}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentQ.difficulty === 'easy'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : currentQ.difficulty === 'medium'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                }`}>
                  {currentQ.difficulty === 'easy' ? 'سهل' : currentQ.difficulty === 'medium' ? 'متوسط' : 'متقدم'}
                </span>
                <span className="text-[10px] text-slate-400">({currentQ.points} درجات)</span>
              </div>
            </div>

            <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {currentQ.questionText}
            </h3>
          </div>

          {/* Visual Graphic if available (comfortably sized for clear technical/numbered reading) */}
          {(currentQ.svgGraphic || currentQ.imageUrl) && (
            <div 
              className="h-32 sm:h-36 max-h-40 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex justify-center items-center p-2 overflow-hidden shrink-0 cursor-zoom-in relative group"
              onClick={() => {
                if (currentQ.imageUrl) setZoomedImg(currentQ.imageUrl);
              }}
            >
              {currentQ.svgGraphic && !currentQ.imageUrl && (
                <VisualShape type={currentQ.svgGraphic} size={150} />
              )}
              {currentQ.imageUrl && (
                <>
                  <img 
                    src={currentQ.imageUrl} 
                    alt="شكل السؤال" 
                    referrerPolicy="no-referrer"
                    className="max-h-28 sm:max-h-32 object-contain rounded-lg transition-transform group-hover:scale-[1.03]" 
                  />
                  <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Search className="w-3 h-3 text-sky-400" />
                    <span>انقر للتكبير</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Options in a 2x2 Grid (Takes minimal vertical space: ~105px total!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = answers[currentQ.id] === opt.id;
              const letter = ['أ', 'ب', 'ج', 'د'][optIdx] || `${optIdx + 1}`;

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-right cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 shadow-xs ring-1 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {letter}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
                      {opt.text}
                    </span>
                    {opt.svgShape && (
                      <div className="mr-1 shrink-0">
                        <VisualShape type={opt.svgShape} size={32} />
                      </div>
                    )}
                  </div>

                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================== */}
        {/* C. ANCHORED BOTTOM NAVIGATION BAR (~44px)                  */}
        {/* ========================================================== */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentQuestionIndex === 0
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>السابق</span>
          </button>

          {/* Quick status indicator in middle */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>مُجاب:</span>
            <span className="font-bold text-emerald-600">{answeredCount}</span>
            <span>من</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{examQuestions.length}</span>
          </div>

          {currentQuestionIndex < examQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>التالي</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>تسليم الاختبار</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* POPUP: QUESTIONS GRID MODAL (Review All 30 Questions)       */}
      {/* ========================================================== */}
      {showQuestionsGridModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-sky-600" />
                <span>قائمة أسئلة الاختبار ({examQuestions.length} سؤالاً)</span>
              </h4>
              <button
                onClick={() => setShowQuestionsGridModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-60 overflow-y-auto p-1">
              {examQuestions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isFlagged = Boolean(flaggedQuestions[q.id]);
                const isCurrent = currentQuestionIndex === idx;

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowQuestionsGridModal(false);
                    }}
                    className={`relative w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'bg-sky-600 text-white ring-2 ring-sky-400 ring-offset-1'
                        : isAnswered
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                <span>مُجاب</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                <span>غير مُجاب</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>مُميز للمراجعة</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              الخروج من الاختبار
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              هل أنت متأكد من رغبتك في إنهاء الجلسة والخروج؟ لن يتم اعتماد إجاباتك إلا إذا قمت بالتسليم الرسمي.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-1/2 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                متابعة الاختبار
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onExitExam();
                }}
                className="w-1/2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                تأكيد الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomedImg && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomedImg(null)}
        >
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white hover:text-sky-400 transition-colors bg-white/10 rounded-full"
              onClick={() => setZoomedImg(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedImg} 
              alt="صورة مكبرة" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* POPUP: CONFIRM SUBMISSION MODAL                            */}
      {/* ========================================================== */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-1">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                تأكيد تسليم الاختبار
              </h3>
              <p className="text-[11px] text-slate-500">
                يرجى مراجعة حالة الإجابة قبل التسليم النهائي
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">إجمالي الأسئلة:</span>
                <span className="font-bold text-slate-900 dark:text-white">{examQuestions.length} سؤالاً</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">الأسئلة المُجاب عنها:</span>
                <span className="font-bold text-emerald-600">{answeredCount} سؤالاً</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-600">الأسئلة المتبقية دون إجابة:</span>
                <span className="font-bold text-rose-600">{examQuestions.length - answeredCount} سؤالاً</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="w-1/2 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                العودة للمراجعة
              </button>
              <button
                type="button"
                onClick={executeSubmission}
                className="w-1/2 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
              >
                تأكيد التسليم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
