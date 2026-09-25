import { Question, GradeLevel, SkillCategory, DifficultyLevel } from '../types';

/**
 * دالة خلط عشوائي للعناصر (Fisher-Yates Shuffle)
 * لضمان الترتيب العشوائي للأسئلة لكل طالب
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * واجهة تمثل نسخة سؤال معروضة في الاختبار مع معرّف ظهور مستقل
 * وربط بالسؤال الأصلي لتحليل التكرار والثبات الإدراكي
 */
export interface ExamQuestionInstance extends Question {
  instanceId: string;      // معرّف ظهور مميز في جلسة الاختبار
  originalQuestionId: string; // معرّف السؤال الأصلي في البنك
  isRepeatedCheck?: boolean;  // هل هذا السؤال مكرر لفحص عشوائية/تأمل إجابة الطالب
  originalQuestionCode?: string;
}

/**
 * توليد 30 سؤالاً على الأقل لكل طالب مع خاصية:
 * 1. التنوع والتوازن في مستويات الصعوبة والمهارات
 * 2. الترتيب العشوائي التام للأسئلة
 * 3. تكرار أسئلة محددة (2 إلى 3 أسئلة) تظهر في مواضع متباعدة عشوائياً
 *    لفحص هل يختار الطالب الإجابة بعشوائية أم بتفكير وتأمل وتماسك إدراكي.
 */
export function generateBalancedStudentQuestions(
  allQuestions: Question[],
  grade: GradeLevel,
  targetCount: number = 30,
  includeRepeatCheck: boolean = true
): ExamQuestionInstance[] {
  // 1. تصفية الأسئلة المناسبة للصف الدراسي للطالب
  let candidateQuestions = allQuestions.filter(q => 
    q.gradeLevels && q.gradeLevels.includes(grade)
  );

  // عدد الأسئلة المكررة للفحص السلوكي (5 أسئلة لضمان كشف العشوائية)
  const repeatCount = includeRepeatCheck ? 5 : 0;
  const uniqueTargetCount = targetCount - repeatCount;

  // إذا كانت الأسئلة أقل من العدد المطلوب، نستكمل حصراً من نفس المرحلة التعليمية منعاً لاختلاط أسئلة المتوسط بالابتدائي
  if (candidateQuestions.length < uniqueTargetCount) {
    const isPrimaryLower = grade === 'g3_primary' || grade === 'g4_primary';
    const isPrimaryUpper = grade === 'g5_primary' || grade === 'g6_primary';
    
    const candidateIds = new Set(candidateQuestions.map(q => q.id));
    const stageCompatible = allQuestions.filter(q => {
      if (candidateIds.has(q.id)) return false;
      const g = q.gradeLevels || [];
      if (isPrimaryLower) {
        return g.includes('g3_primary') || g.includes('g4_primary');
      } else if (isPrimaryUpper) {
        return g.includes('g4_primary') || g.includes('g5_primary') || g.includes('g6_primary');
      } else {
        return g.includes('g1_middle') || g.includes('g2_middle') || g.includes('g3_middle');
      }
    });

    candidateQuestions = [...candidateQuestions, ...shuffleArray(stageCompatible)];
  }

  // 2. تصنيف الأسئلة حسب مستوى الصعوبة
  const easyPool = candidateQuestions.filter(q => q.difficulty === 'easy');
  const mediumPool = candidateQuestions.filter(q => q.difficulty === 'medium');
  const hardPool = candidateQuestions.filter(q => q.difficulty === 'hard' || q.difficulty === 'advanced');

  // خلط بنوك الصعوبة
  const shuffledEasy = shuffleArray(easyPool);
  const shuffledMedium = shuffleArray(mediumPool);
  const shuffledHard = shuffleArray(hardPool);

  // 3. تحديد الأعداد المتوازنة بحسب المتوفر في الفئة العمرية
  // نضمن أولوية إدراج الأسئلة الجوهرية البصرية والميكانيكية (مثل رافعة المقص، والتروس، والدوران الذهني) إذا كانت مطابقة لمرحلة الطالب
  const priorityVisualIds = ['q_sm_2', 'q_sm_1', 'q_rot_spatial_1', 'q_vis_gears_4', 'q_sv_3', 'q_vis_gears_1'];
  const matchedPriorityQuestions = candidateQuestions.filter(q => priorityVisualIds.includes(q.id));
  const priorityIdsSet = new Set(matchedPriorityQuestions.map(q => q.id));

  // تصفية باقي البنوك بدون الأسئلة ذات الأولوية لمنع التكرار
  const remainingEasy = shuffledEasy.filter(q => !priorityIdsSet.has(q.id));
  const remainingMedium = shuffledMedium.filter(q => !priorityIdsSet.has(q.id));
  const remainingHard = shuffledHard.filter(q => !priorityIdsSet.has(q.id));

  const targetEasyCount = Math.min(remainingEasy.length, Math.max(6, Math.round(uniqueTargetCount * 0.30)));
  const targetHardCount = Math.min(remainingHard.length, Math.round(uniqueTargetCount * 0.20));
  const targetMediumCount = Math.min(
    remainingMedium.length, 
    Math.max(0, uniqueTargetCount - (matchedPriorityQuestions.length + targetEasyCount + targetHardCount))
  );

  const selectedEasy = remainingEasy.slice(0, targetEasyCount);
  const selectedMedium = remainingMedium.slice(0, targetMediumCount);
  const selectedHard = remainingHard.slice(0, targetHardCount);

  let selectedUnique = [...matchedPriorityQuestions, ...selectedEasy, ...selectedMedium, ...selectedHard];

  if (selectedUnique.length < uniqueTargetCount) {
    const selectedIds = new Set(selectedUnique.map(q => q.id));
    const remaining = candidateQuestions.filter(q => !selectedIds.has(q.id));
    const extraNeeded = uniqueTargetCount - selectedUnique.length;
    selectedUnique = [...selectedUnique, ...shuffleArray(remaining).slice(0, extraNeeded)];
  }

  // تحويل الأسئلة إلى QuestionInstances
  const primaryInstances: ExamQuestionInstance[] = selectedUnique.map((q, idx) => {
    const instId = `inst1_${q.id}_${idx}`;
    return {
      ...q,
      id: instId, // نغير المعرف ليكون فريداً لكل ظهور
      instanceId: instId,
      originalQuestionId: q.id,
      originalQuestionCode: q.code,
      isRepeatedCheck: false,
      // خلط خيارات الإجابة لكل نسخة بشكل مستقل لضمان عدم ثبات المواقع في الأسئلة المكررة
      options: shuffleArray(q.options),
    };
  });

  // إذا تم طلب فحص التكرار: نختار 2 من الأسئلة المتنوعة (مثل سؤال متوسط وسؤال استدلال/مرونة)
  // وننشئ نسخة ثانية لكل منهما مع مسافة كافية بين الظهورين
  if (includeRepeatCheck && primaryInstances.length >= 6) {
    // نختار سؤالين من النصف الأول من الأسئلة
    const halfLen = Math.floor(primaryInstances.length / 2);
    const candidateSource = shuffleArray(primaryInstances.slice(0, halfLen));
    const toRepeat = candidateSource.slice(0, repeatCount);

    const repeatedInstances: ExamQuestionInstance[] = toRepeat.map((q, rIdx) => {
      const instId = `inst2_rep_${q.originalQuestionId}_${rIdx}`;
      return {
        ...q,
        id: instId, // معرف فريد للنسخة المكررة
        instanceId: instId,
        originalQuestionId: q.originalQuestionId,
        originalQuestionCode: q.originalQuestionCode,
        isRepeatedCheck: true,
        // خلط الخيارات مجدداً للنسخة المكررة لضمان تغيير أماكنها
        options: shuffleArray(q.options),
      };
    });

    // نخلط القائمة الأساسية أولاً
    const shuffledPrimary = shuffleArray(primaryInstances);

    // ندخل النسخ المكررة في النصف الثاني أو الثلث الأخير بمسافة تضمن عدم تجاور السؤالين
    const combined: ExamQuestionInstance[] = [...shuffledPrimary];
    repeatedInstances.forEach((repInst, i) => {
      // إيجاد مكان السؤال الأول
      const firstIndex = combined.findIndex(item => item.originalQuestionId === repInst.originalQuestionId);
      // نريد وضع السؤال المكرر بعد الأول بـ 7 أسئلة على الأقل
      const minInsertIndex = Math.min(combined.length, (firstIndex !== -1 ? firstIndex + 7 : Math.floor(combined.length * 0.6)));
      const insertAt = Math.min(
        combined.length, 
        Math.max(minInsertIndex, Math.floor(minInsertIndex + (combined.length - minInsertIndex) * ((i + 1) / (repeatCount + 1))))
      );
      combined.splice(insertAt, 0, repInst);
    });

    return combined;
  }

  // ترتيب عشوائي شامل
  return shuffleArray(primaryInstances);
}
