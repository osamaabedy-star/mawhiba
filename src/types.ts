/**
 * أنواع البيانات لمنصة الإبداع للكشف المبدئي عن الموهوبين
 * مدارس رياض الإبداع الأهلية
 */

export type UserRole = 'supervisor' | 'student' | 'viewer';

export type GradeLevel = 
  | 'g3_primary' // الصف الثالث الابتدائي
  | 'g4_primary' // الصف الرابع الابتدائي
  | 'g5_primary' // الصف الخامس الابتدائي
  | 'g6_primary' // الصف السادس الابتدائي
  | 'g1_middle'  // الصف الأول المتوسط
  | 'g2_middle'  // الصف الثاني المتوسط
  | 'g3_middle'; // الصف الثالث المتوسط

export const GRADE_LABELS: Record<GradeLevel, string> = {
  g3_primary: 'الصف الثالث الابتدائي',
  g4_primary: 'الصف الرابع الابتدائي',
  g5_primary: 'الصف الخامس الابتدائي',
  g6_primary: 'الصف السادس الابتدائي',
  g1_middle: 'الصف الأول المتوسط',
  g2_middle: 'الصف الثاني المتوسط',
  g3_middle: 'الصف الثالث المتوسط',
};

export type SkillCategory = 
  | 'mental_flexibility'    // المرونة العقلية
  | 'linguistic_reasoning'  // الاستدلال اللغوي وفهم المقروء
  | 'math_reasoning'        // الاستدلال الرياضي
  | 'spatial_visual'        // الاستدلال المكاني والبصري
  | 'scientific_mechanical' // الاستدلال العلمي والميكانيكي
  | 'problem_solving';      // حل المشكلات والتفكير المنطقي

export interface SkillDefinition {
  id: SkillCategory;
  name: string;
  description: string;
  color: string;
}

export const SKILL_DEFINITIONS: Record<SkillCategory, SkillDefinition> = {
  mental_flexibility: {
    id: 'mental_flexibility',
    name: 'المرونة العقلية',
    description: 'تغيير طريقة التفكير، إيجاد بدائل، والتعامل مع الأنماط والقواعد المتغيرة',
    color: '#8b5cf6', // Violet
  },
  linguistic_reasoning: {
    id: 'linguistic_reasoning',
    name: 'الاستدلال اللغوي وفهم المقروء',
    description: 'فهم النصوص، استنتاج المعنى، والعلاقات بين المفاهيم اللفظية',
    color: '#3b82f6', // Blue
  },
  math_reasoning: {
    id: 'math_reasoning',
    name: 'الاستدلال الرياضي',
    description: 'الأنماط العددية، العلاقات الكمية، والتفكير المنطقي الرياضي المتدرج',
    color: '#0ea5e9', // Sky
  },
  spatial_visual: {
    id: 'spatial_visual',
    name: 'الاستدلال المكاني والبصري',
    description: 'التصور الذهني للأشكال، الدوران، المطابقة البصرية، وإكمال الأنماط',
    color: '#10b981', // Emerald
  },
  scientific_mechanical: {
    id: 'scientific_mechanical',
    name: 'الاستدلال العلمي والميكانيكي',
    description: 'السبب والنتيجة، الآلات البسيطة (تروس وروافع)، والظواهر الفيزيائية',
    color: '#f59e0b', // Amber
  },
  problem_solving: {
    id: 'problem_solving',
    name: 'حل المشكلات والتفكير المنطقي',
    description: 'ترتيب الأحداث، استنتاج القواعد، وتحليل المعطيات لاتخاذ القرار',
    color: '#ec4899', // Pink
  },
};

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'advanced';

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { label: string; color: string }> = {
  easy: { label: 'سهل', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  medium: { label: 'متوسط', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  hard: { label: 'صعب', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  advanced: { label: 'متقدم', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

export type TestLevel = 'preparation' | 'distinction' | 'advanced';

export const TEST_LEVEL_LABELS: Record<TestLevel, { label: string; desc: string }> = {
  preparation: { label: 'المستوى الأول: التهيئة', desc: 'أسئلة تمهيدية لقياس المهارات الأساسية وتحديد المستوى الأولي' },
  distinction: { label: 'المستوى الثاني: التميز', desc: 'أسئلة تفكير تحليلي وأنماط واستدلال متعدد الخطوات' },
  advanced: { label: 'المستوى الثالث: التقدم', desc: 'أسئلة تحدٍ واستدلال مركب وحل مشكلات غير مألوفة' },
};

export type QuestionType = 
  | 'multiple_choice_4' 
  | 'multiple_choice_3' 
  | 'image_choice' 
  | 'pattern_completion' 
  | 'true_false' 
  | 'numeric_input';

export interface QuestionOption {
  id: string;
  text?: string;
  imageUrl?: string;
  svgShape?: string; // Pre-built visual SVG identifier
}

export interface Question {
  id: string;
  code: string; // e.g., Q-101
  title: string;
  questionText: string;
  imageUrl?: string;
  svgGraphic?: string; // Built-in SVG graphic string or identifier
  type: QuestionType;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  skill: SkillCategory;
  subSkill?: string;
  gradeLevels: GradeLevel[];
  difficulty: DifficultyLevel;
  points: number;
  estimatedTimeSeconds: number;
  isExperimental: boolean;
  status: 'active' | 'archived' | 'draft';
  supervisorNotes?: string;
  usageCount: number;
  correctAnswersCount: number;
}

export interface TestModel {
  id: string;
  name: string; // e.g. النموذج الأول
  code: string; // e.g. M-1
  questionIds: string[];
}

export interface Test {
  id: string;
  title: string;
  description: string;
  targetGrades: GradeLevel[];
  level: TestLevel;
  coveredSkills: SkillCategory[];
  durationMinutes: number;
  pointsPerQuestion: number;
  allowBackNavigation: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showInstantResults: boolean;
  instructions: string;
  status: 'published' | 'draft' | 'archived';
  models: TestModel[];
  createdAt: string;
  assignedStudentIds: string[];
  assignedGroupNames: string[];
}

export interface Student {
  id: string;
  fullName: string;
  internalStudentId?: string; // e.g., STU-2026-042
  studentNumber?: string;
  nationalId?: string; // Full or unmasked
  nationalIdMasked?: string; // Private / masked
  grade?: GradeLevel;
  gradeLevel?: GradeLevel;
  classroom: string; // e.g., 3/أ أو 1/ب
  gender?: 'male' | 'female';
  groupName?: string;
  assignedTestId?: string;
  assignedDate?: string;
  notes?: string;
  status: 'active' | 'archived' | 'not_started' | 'in_progress' | 'completed';
}

export type CandidateStatus = 
  | 'not_taken'             // لم يؤد الاختبار
  | 'in_progress'           // قيد الاختبار
  | 'completed'             // مكتمل
  | 'needs_review'          // يحتاج إلى مراجعة
  | 'nominated_preliminary' // مرشح مبدئيًا للتحقق
  | 'needs_extra_test'      // يحتاج إلى اختبار إضافي
  | 'not_nominated'         // غير مرشح في هذه المرحلة
  | 'reviewed_by_supervisor'; // تمت مراجعته من المشرف

export const CANDIDATE_STATUS_INFO: Record<CandidateStatus, { label: string; badgeClass: string; desc: string }> = {
  not_taken: { 
    label: 'لم يؤد الاختبار', 
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    desc: 'لم يبدأ الطالب في أداء أي اختبار حتى الآن' 
  },
  in_progress: { 
    label: 'قيد الاختبار', 
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    desc: 'جاري أداء الاختبار حالياً' 
  },
  completed: { 
    label: 'مكتمل - بانتظار المراجعة', 
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    desc: 'أتم الطالب الاختبار وتم تصحيحه بانتظار قرار المشرف' 
  },
  needs_review: { 
    label: 'يحتاج إلى مراجعة', 
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'نتائج متفاوتة تتطلب فحصاً نوعياً من مشرف الموهوبين' 
  },
  nominated_preliminary: { 
    label: 'مرشح مبدئيًا للتحقق', 
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    desc: 'مؤشرات أداء متميزة تؤهل الطالب لمرحلة التحقق والتقييم المتخصصة' 
  },
  needs_extra_test: { 
    label: 'يحتاج إلى اختبار إضافي', 
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    desc: 'ينصح بإسناد نموذج موازٍ لقياس ثبات الأداء' 
  },
  not_nominated: { 
    label: 'غير مرشح في هذه المرحلة', 
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-300',
    desc: 'مؤشرات الأداء الحالية لا تتطلب إجراءات تحقق إضافية حالياً' 
  },
  reviewed_by_supervisor: { 
    label: 'تمت المراجعة من المشرف', 
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 font-semibold',
    desc: 'تم فحص نتائج الطالب وتوثيق حالة الموهبة بنجاح' 
  },
};

export interface StudentSkillResult {
  skill: SkillCategory;
  score: number;
  totalPoints: number;
  percentage: number;
  questionsCount: number;
  correctCount: number;
  status: 'high' | 'moderate' | 'needs_development';
}

export interface StudentAnswer {
  questionId: string; // This will be the instanceId
  originalQuestionId?: string; // The ID of the question in the bank
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect: boolean;
  pointsAwarded: number;
  timeSpentSeconds: number;
}

export interface ExamSubmission {
  id: string;
  studentId: string;
  testId: string;
  modelId: string;
  startTime: string;
  endTime: string;
  timeSpentSeconds: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  totalQuestions: number;
  correctAnswersCount: number;
  wrongAnswersCount: number;
  unansweredCount: number;
  skillResults: Record<SkillCategory, StudentSkillResult>;
  difficultyResults: Record<DifficultyLevel, { score: number; maxScore: number; percentage: number }>;
  answers: Record<string, StudentAnswer>;
  candidateStatus: CandidateStatus;
  supervisorNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  strengths: string[];
  areasToDevelop: string[];
  consistencyAnalysis?: {
    repeatedPairsCount: number;
    consistentPairsCount: number;
    inconsistentPairsCount: number;
    consistencyRate: number; // 0 to 100%
    behaviorPattern: 'deliberate_thought' | 'mostly_thoughtful' | 'suspicious_random' | 'high_random';
    behaviorDescription: string;
    details: Array<{
      questionCode: string;
      questionTitle: string;
      firstAnswerText?: string;
      secondAnswerText?: string;
      isMatch: boolean;
      bothCorrect: boolean;
      bothIncorrect: boolean;
    }>;
  };
}

export interface AppSettings {
  schoolName: string;
  platformName: string;
  supervisorName: string;
  supervisorTitle: string;
  schoolLogoUrl: string;
  primaryColor: string;
  minScoreForNomination: number; // default 80%
  minHighSkillsForNomination: number; // default 2
  darkMode: boolean;
  reportDisclaimer: string;
  questionCounts: Record<GradeLevel, number>;
  backupLastDate?: string;
}
