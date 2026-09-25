import { 
  Question, 
  Test, 
  Student, 
  ExamSubmission, 
  AppSettings, 
  SkillCategory, 
  DifficultyLevel,
  StudentSkillResult,
  CandidateStatus
} from '../types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_QUESTIONS, 
  INITIAL_STUDENTS, 
  INITIAL_TESTS, 
  INITIAL_SUBMISSIONS 
} from '../data/initialData';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch,
  getDoc
} from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'riyadh_ibda_talents_';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AppDatabaseState {
  settings: AppSettings;
  questions: Question[];
  tests: Test[];
  students: Student[];
  submissions: ExamSubmission[];
}

export function loadDatabase(): AppDatabaseState {
  try {
    const settingsStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}settings`);
    const questionsStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}questions`);
    const testsStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}tests`);
    const studentsStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}students`);
    const submissionsStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}submissions`);

    let loadedQuestions: Question[] = questionsStr ? JSON.parse(questionsStr) : INITIAL_QUESTIONS;
    
    // Sync system questions with calibrated gradeLevels, difficulties, and content from INITIAL_QUESTIONS
    const initialMap = new Map<string, Question>(INITIAL_QUESTIONS.map(q => [q.id, q]));
    
    // Deduplicate and calibrate
    const seenMap = new Map<string, Question>();
    
    // First, process loaded questions and update with any calibrated definitions
    for (const q of loadedQuestions) {
      const initial = initialMap.get(q.id);
      if (initial) {
        seenMap.set(q.id, {
          ...q,
          gradeLevels: initial.gradeLevels,
          difficulty: initial.difficulty,
          skill: initial.skill,
          subSkill: initial.subSkill || q.subSkill,
          title: initial.title,
          questionText: initial.questionText,
          options: initial.options,
          correctOptionId: initial.correctOptionId,
          explanation: initial.explanation,
          svgGraphic: initial.svgGraphic || q.svgGraphic,
          imageUrl: initial.imageUrl || q.imageUrl,
        });
      } else {
        // Custom user question
        if (!seenMap.has(q.id)) {
          seenMap.set(q.id, q);
        }
      }
    }

    // Add any missing questions from INITIAL_QUESTIONS
    for (const initial of INITIAL_QUESTIONS) {
      if (!seenMap.has(initial.id)) {
        seenMap.set(initial.id, initial);
      }
    }

    loadedQuestions = Array.from(seenMap.values());
    localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(loadedQuestions));

    let loadedSettings: AppSettings = settingsStr ? JSON.parse(settingsStr) : INITIAL_SETTINGS;
    
    // Ensure all required fields from INITIAL_SETTINGS exist (migration for existing users)
    loadedSettings = {
      ...INITIAL_SETTINGS,
      ...loadedSettings,
      questionCounts: {
        ...INITIAL_SETTINGS.questionCounts,
        ...(loadedSettings.questionCounts || {})
      }
    };

    if (loadedSettings.platformName?.includes('منصة الإبداع')) {
      loadedSettings.platformName = 'منصة الموهوبين';
    }

    let loadedStudents: Student[] = studentsStr ? JSON.parse(studentsStr) : INITIAL_STUDENTS;
    if (loadedStudents.length < INITIAL_STUDENTS.length) {
      const existingStuIds = new Set(loadedStudents.map(s => s.id));
      const missing = INITIAL_STUDENTS.filter(s => !existingStuIds.has(s.id));
      if (missing.length > 0) {
        loadedStudents = [...loadedStudents, ...missing];
        localStorage.setItem(`${STORAGE_KEY_PREFIX}students`, JSON.stringify(loadedStudents));
      }
    }

    // Sync tests models from INITIAL_TESTS to ensure calibrated question selections
    let loadedTests: Test[] = testsStr ? JSON.parse(testsStr) : INITIAL_TESTS;
    const initialTestMap = new Map<string, Test>(INITIAL_TESTS.map(t => [t.id, t]));
    loadedTests = loadedTests.map(t => {
      const init = initialTestMap.get(t.id);
      if (init) {
        return {
          ...t,
          models: init.models,
          targetGrades: init.targetGrades,
        };
      }
      return t;
    });
    localStorage.setItem(`${STORAGE_KEY_PREFIX}tests`, JSON.stringify(loadedTests));

    return {
      settings: loadedSettings,
      questions: loadedQuestions,
      tests: loadedTests,
      students: loadedStudents,
      submissions: submissionsStr ? JSON.parse(submissionsStr) : INITIAL_SUBMISSIONS,
    };
  } catch (error) {
    console.error('Failed to load database from localStorage, resetting to defaults:', error);
    return {
      settings: INITIAL_SETTINGS,
      questions: INITIAL_QUESTIONS,
      tests: INITIAL_TESTS,
      students: INITIAL_STUDENTS,
      submissions: INITIAL_SUBMISSIONS,
    };
  }
}

export function saveDatabase(data: AppDatabaseState): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}settings`, JSON.stringify(data.settings));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}questions`, JSON.stringify(data.questions));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}tests`, JSON.stringify(data.tests));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}students`, JSON.stringify(data.students));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}submissions`, JSON.stringify(data.submissions));
    
    // Asynchronously try to sync to Firestore if user is supervisor
    const isSupervisor = auth.currentUser?.email === 'osamaabedy@gmail.com';
    if (isSupervisor) {
      syncDatabaseToFirestore(data).catch(err => console.warn('Background sync failed:', err));
    }
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  
  const sanitized: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  });
  return sanitized;
}

export async function syncDatabaseToFirestore(data: AppDatabaseState): Promise<void> {
  const isSupervisor = auth.currentUser?.email === 'osamaabedy@gmail.com';
  if (!isSupervisor) return;

  try {
    const batch = writeBatch(db);
    
    // Settings
    batch.set(doc(db, 'settings', 'config'), sanitizeForFirestore(data.settings));
    
    // Questions (sync changed or all)
    data.questions.forEach(q => {
      batch.set(doc(db, 'questions', q.id), sanitizeForFirestore(q));
    });
    
    // Students
    data.students.forEach(s => {
      batch.set(doc(db, 'students', s.id), sanitizeForFirestore(s));
    });
    
    // Tests
    data.tests.forEach(t => {
      batch.set(doc(db, 'tests', t.id), sanitizeForFirestore(t));
    });
    
    // Submissions
    data.submissions.forEach(sub => {
      batch.set(doc(db, 'submissions', sub.id), sanitizeForFirestore(sub));
    });

    await batch.commit();
    console.log('Database synced to Firestore successfully.');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'all_collections');
  }
}

export async function loadDatabaseFromFirestore(): Promise<AppDatabaseState | null> {
  try {
    const questionsSnap = await getDocs(collection(db, 'questions'));
    const studentsSnap = await getDocs(collection(db, 'students'));
    const testsSnap = await getDocs(collection(db, 'tests'));
    const submissionsSnap = await getDocs(collection(db, 'submissions'));
    const settingsSnap = await getDoc(doc(db, 'settings', 'config'));

    if (questionsSnap.empty && studentsSnap.empty) return null;

    const settingsData = settingsSnap.exists() ? settingsSnap.data() as AppSettings : INITIAL_SETTINGS;
    const mergedSettings = {
      ...INITIAL_SETTINGS,
      ...settingsData,
      questionCounts: {
        ...INITIAL_SETTINGS.questionCounts,
        ...(settingsData.questionCounts || {})
      }
    };

    return {
      settings: mergedSettings,
      questions: questionsSnap.docs.map(d => d.data() as Question),
      students: studentsSnap.docs.map(d => d.data() as Student),
      tests: testsSnap.docs.map(d => d.data() as Test),
      submissions: submissionsSnap.docs.map(d => d.data() as ExamSubmission),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'all_collections');
    return null;
  }
}

export function resetDatabaseToDefaults(): AppDatabaseState {
  const defaults: AppDatabaseState = {
    settings: INITIAL_SETTINGS,
    questions: INITIAL_QUESTIONS,
    tests: INITIAL_TESTS,
    students: INITIAL_STUDENTS,
    submissions: INITIAL_SUBMISSIONS,
  };
  saveDatabase(defaults);
  return defaults;
}

/**
 * دالة التصحيح التلقائي المرن لاختبار الطالب
 * تحسب: الدرجة الخام، النسبة المئوية، درجات المهارات، درجات مستويات الصعوبة،
 * ونقاط القوة والمؤشر المبدئي للترشيح.
 */
export function evaluateExamSubmission(params: {
  studentId: string;
  test: Test;
  modelId: string;
  questions: Question[];
  studentAnswers: Record<string, string>; // questionId -> selectedOptionId / text
  timeSpentSeconds: number;
  minScoreForNomination: number;
  minHighSkillsForNomination: number;
  customQuestions?: Question[];
}): ExamSubmission {
  const { 
    studentId, 
    test, 
    modelId, 
    questions, 
    studentAnswers, 
    timeSpentSeconds,
    minScoreForNomination,
    minHighSkillsForNomination,
    customQuestions
  } = params;

  const model = test?.models?.find(m => m.id === modelId) || test?.models?.[0];
  const modelQuestions = customQuestions && customQuestions.length > 0
    ? customQuestions
    : questions.filter(q => model?.questionIds?.includes(q.id));

  let totalScore = 0;
  let maxScore = 0;
  let correctAnswersCount = 0;
  let wrongAnswersCount = 0;
  let unansweredCount = 0;

  const skillAccumulator: Record<SkillCategory, { score: number; total: number; count: number; correct: number }> = {
    mental_flexibility: { score: 0, total: 0, count: 0, correct: 0 },
    linguistic_reasoning: { score: 0, total: 0, count: 0, correct: 0 },
    math_reasoning: { score: 0, total: 0, count: 0, correct: 0 },
    spatial_visual: { score: 0, total: 0, count: 0, correct: 0 },
    scientific_mechanical: { score: 0, total: 0, count: 0, correct: 0 },
    problem_solving: { score: 0, total: 0, count: 0, correct: 0 },
  };

  const difficultyAccumulator: Record<DifficultyLevel, { score: number; maxScore: number }> = {
    easy: { score: 0, maxScore: 0 },
    medium: { score: 0, maxScore: 0 },
    hard: { score: 0, maxScore: 0 },
    advanced: { score: 0, maxScore: 0 },
  };

  const evaluatedAnswers: ExamSubmission['answers'] = {};

  modelQuestions.forEach(q => {
    const points = q.points || test.pointsPerQuestion || 5;
    maxScore += points;
    skillAccumulator[q.skill].total += points;
    skillAccumulator[q.skill].count += 1;
    difficultyAccumulator[q.difficulty].maxScore += points;

    const answer = studentAnswers[q.id];
    if (!answer || answer.trim() === '') {
      unansweredCount += 1;
      evaluatedAnswers[q.id] = {
        questionId: q.id,
        originalQuestionId: (q as any).originalQuestionId || q.id,
        isCorrect: false,
        pointsAwarded: 0,
        timeSpentSeconds: 0,
      };
    } else {
      const isCorrect = (answer === q.correctOptionId) || 
        (q.type === 'numeric_input' && answer.trim() === q.correctOptionId.trim());

      if (isCorrect) {
        correctAnswersCount += 1;
        totalScore += points;
        skillAccumulator[q.skill].score += points;
        skillAccumulator[q.skill].correct += 1;
        difficultyAccumulator[q.difficulty].score += points;
      } else {
        wrongAnswersCount += 1;
      }

      evaluatedAnswers[q.id] = {
        questionId: q.id,
        originalQuestionId: (q as any).originalQuestionId || q.id,
        selectedOptionId: answer,
        isCorrect,
        pointsAwarded: isCorrect ? points : 0,
        timeSpentSeconds: Math.floor(timeSpentSeconds / modelQuestions.length),
      };
    }
  });

  const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;

  // Compile Skill Results
  const skillResults: Record<SkillCategory, StudentSkillResult> = {} as any;
  const strengths: string[] = [];
  const areasToDevelop: string[] = [];
  let highSkillsCount = 0;

  const skillArabicNames: Record<SkillCategory, string> = {
    mental_flexibility: 'المرونة العقلية',
    linguistic_reasoning: 'الاستدلال اللغوي',
    math_reasoning: 'الاستدلال الرياضي',
    spatial_visual: 'الاستدلال المكاني والبصري',
    scientific_mechanical: 'الاستدلال العلمي والميكانيكي',
    problem_solving: 'حل المشكلات والتفكير المنطقي',
  };

  (Object.keys(skillAccumulator) as SkillCategory[]).forEach(sk => {
    const acc = skillAccumulator[sk];
    const skPct = acc.total > 0 ? (acc.score / acc.total) * 100 : 0;
    let status: StudentSkillResult['status'] = 'moderate';
    if (skPct >= 75) {
      status = 'high';
      if (acc.count > 0) {
        highSkillsCount += 1;
        strengths.push(skillArabicNames[sk]);
      }
    } else if (skPct < 50 && acc.count > 0) {
      status = 'needs_development';
      areasToDevelop.push(skillArabicNames[sk]);
    }

    skillResults[sk] = {
      skill: sk,
      score: acc.score,
      totalPoints: acc.total,
      percentage: Number(skPct.toFixed(1)),
      questionsCount: acc.count,
      correctCount: acc.correct,
      status,
    };
  });

  // Compile Difficulty Results
  const difficultyResults: ExamSubmission['difficultyResults'] = {
    easy: {
      score: difficultyAccumulator.easy.score,
      maxScore: difficultyAccumulator.easy.maxScore,
      percentage: difficultyAccumulator.easy.maxScore > 0 ? Number(((difficultyAccumulator.easy.score / difficultyAccumulator.easy.maxScore) * 100).toFixed(1)) : 100,
    },
    medium: {
      score: difficultyAccumulator.medium.score,
      maxScore: difficultyAccumulator.medium.maxScore,
      percentage: difficultyAccumulator.medium.maxScore > 0 ? Number(((difficultyAccumulator.medium.score / difficultyAccumulator.medium.maxScore) * 100).toFixed(1)) : 100,
    },
    hard: {
      score: difficultyAccumulator.hard.score,
      maxScore: difficultyAccumulator.hard.maxScore,
      percentage: difficultyAccumulator.hard.maxScore > 0 ? Number(((difficultyAccumulator.hard.score / difficultyAccumulator.hard.maxScore) * 100).toFixed(1)) : 100,
    },
    advanced: {
      score: difficultyAccumulator.advanced.score,
      maxScore: difficultyAccumulator.advanced.maxScore,
      percentage: difficultyAccumulator.advanced.maxScore > 0 ? Number(((difficultyAccumulator.advanced.score / difficultyAccumulator.advanced.maxScore) * 100).toFixed(1)) : 100,
    },
  };

  // Determine Candidate Preliminary Status
  let candidateStatus: CandidateStatus = 'completed';
  if (percentage >= minScoreForNomination && highSkillsCount >= minHighSkillsForNomination) {
    candidateStatus = 'nominated_preliminary';
  } else if (percentage >= 60 && percentage < minScoreForNomination) {
    candidateStatus = 'needs_review';
  } else if (percentage < 50) {
    candidateStatus = 'not_nominated';
  }

  const nowIso = new Date().toISOString();

  // Analyze Consistency on Repeated Questions (if any)
  // لفحص هل يختار الطالب الإجابة بعشوائية أو بعد تفكير وتأمل
  let consistencyAnalysis: ExamSubmission['consistencyAnalysis'] = undefined;

  // استخراج الأسئلة المكررة في نموذج الاختبار الحالي
  const questionOccurrences: Record<string, Array<{ instanceId: string; optionId?: string; isCorrect: boolean }>> = {};
  modelQuestions.forEach(q => {
    const rawId = (q as any).originalQuestionId || q.id;
    const answeredOpt = studentAnswers[q.id];
    const isCorr = evaluatedAnswers[q.id]?.isCorrect || false;
    
    // We only care about consistency if we have multiple instances of the SAME originalQuestionId
    if (rawId) {
      if (!questionOccurrences[rawId]) {
        questionOccurrences[rawId] = [];
      }
      questionOccurrences[rawId].push({
        instanceId: q.id,
        optionId: answeredOpt,
        isCorrect: isCorr,
      });
    }
  });

  const repeatedKeys = Object.keys(questionOccurrences).filter(k => questionOccurrences[k].length >= 2);
  if (repeatedKeys.length > 0) {
    let repeatedPairsCount = 0;
    let consistentPairsCount = 0;
    let inconsistentPairsCount = 0;
    const details: NonNullable<ExamSubmission['consistencyAnalysis']>['details'] = [];

    repeatedKeys.forEach(rawId => {
      const occurrences = questionOccurrences[rawId];
      // Since it's a repeated question, we might have 2 or more instances. We'll compare the first two.
      const first = occurrences[0];
      const second = occurrences[1];

      repeatedPairsCount++;
      
      // Get the original question to find correct options
      const originalQ = questions.find(q => q.id === rawId) || modelQuestions.find(q => ((q as any).originalQuestionId || q.id) === rawId);
      
      const isMatch = Boolean(first.optionId && second.optionId && first.optionId === second.optionId);
      if (isMatch) {
        consistentPairsCount++;
      } else {
        inconsistentPairsCount++;
      }

      const firstOpt = originalQ?.options?.find(o => o.id === first.optionId)?.text || first.optionId || 'لم يُجب';
      const secondOpt = originalQ?.options?.find(o => o.id === second.optionId)?.text || second.optionId || 'لم يُجب';

      details.push({
        questionCode: originalQ?.code || rawId,
        questionTitle: originalQ?.questionText || originalQ?.title || 'سؤال فحص الاتساق',
        firstAnswerText: firstOpt,
        secondAnswerText: secondOpt,
        isMatch,
        bothCorrect: Boolean(first.isCorrect && second.isCorrect),
        bothIncorrect: Boolean(!first.isCorrect && !second.isCorrect),
      });
    });

    const consistencyRate = repeatedPairsCount > 0 
      ? Math.round((consistentPairsCount / repeatedPairsCount) * 100) 
      : 100;

    let behaviorPattern: NonNullable<ExamSubmission['consistencyAnalysis']>['behaviorPattern'] = 'deliberate_thought';
    let behaviorDescription = 'إجابات متطابقة وواعية؛ مؤشر قوي على التفكير المركز والتأني والابتعاد عن التخمين العشوائي.';

    if (consistencyRate === 100) {
      behaviorPattern = 'deliberate_thought';
      behaviorDescription = 'ثبات كامل (100%) في إجابات الأسئلة المتكررة؛ يدل على قراءة واعية وتفكير منهجي واثق.';
    } else if (consistencyRate >= 50) {
      behaviorPattern = 'mostly_thoughtful';
      behaviorDescription = 'ثبات جزئي؛ الطالب يفكر في معظم الأسئلة مع احتمال تردد بسيط أو إعادة نظر في بعض الخيارات.';
    } else if (percentage < 45) {
      behaviorPattern = 'high_random';
      behaviorDescription = 'تطابق ضعيف وتناقض في الإجابات مع تدني الدرجة؛ مؤشر واضح على الاختيار السريع أو العشوائي دون تأمل.';
    } else {
      behaviorPattern = 'suspicious_random';
      behaviorDescription = 'تفاوت بين إجابات السؤال نفسه؛ يُحتمل وجود تسرع أو تخمين في بعض الفقرات يتطلب التحقق.';
    }

    consistencyAnalysis = {
      repeatedPairsCount,
      consistentPairsCount,
      inconsistentPairsCount,
      consistencyRate,
      behaviorPattern,
      behaviorDescription,
      details,
    };
  }

  return {
    id: `sub_${Date.now()}`,
    studentId,
    testId: test.id,
    modelId,
    startTime: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
    endTime: nowIso,
    timeSpentSeconds,
    totalScore,
    maxScore,
    percentage,
    totalQuestions: modelQuestions.length,
    correctAnswersCount,
    wrongAnswersCount,
    unansweredCount,
    skillResults,
    difficultyResults,
    answers: evaluatedAnswers,
    candidateStatus,
    supervisorNotes: candidateStatus === 'nominated_preliminary' 
      ? 'ترشيح مبدئي تلقائي بحسب المعايير المعتمدة؛ يرجى استكمال التحقق النوعي والملاحظة الصفية.'
      : 'أتم الطالب الاختبار بنجاح وبانتظار اعتماد المراجعة من المشرف.',
    strengths,
    areasToDevelop,
    consistencyAnalysis,
  };
}
