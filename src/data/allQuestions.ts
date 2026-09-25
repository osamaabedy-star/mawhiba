import { Question, GradeLevel } from '../types';
import { QUESTIONS_PRIMARY_LOWER } from './questionsPrimaryLower';
import { QUESTIONS_LOWER_EXTRA } from './questionsLowerExtra';
import { QUESTIONS_PRIMARY_UPPER } from './questionsPrimaryUpper';
import { QUESTIONS_UPPER_EXTRA } from './questionsUpperExtra';
import { QUESTIONS_INTERMEDIATE } from './questionsIntermediate';
import { QUESTIONS_INTERMEDIATE_EXTRA } from './questionsIntermediateExtra';
import { QUESTIONS_VISUAL_MULTIGRADE } from './questionsVisualMultiGrade';
import { QUESTIONS_ADVANCED_LEVELS } from './mawhibaLevelExpansion';

/**
 * بنك الأسئلة الشامل لمنصة الإبداع للكشف عن الموهوبين
 * مدارس رياض الإبداع الأهلية
 * 
 * يغطي كافة المراحل (من الصف الثالث الابتدائي حتى الثالث المتوسط)
 * بحيث يحظى كل صف بما لا يقل عن 30 إلى 40 سؤالاً نوعياً منوعاً
 */
export const ALL_SYSTEM_QUESTIONS: Question[] = [
  ...QUESTIONS_PRIMARY_LOWER,
  ...QUESTIONS_LOWER_EXTRA,
  ...QUESTIONS_PRIMARY_UPPER,
  ...QUESTIONS_UPPER_EXTRA,
  ...QUESTIONS_INTERMEDIATE,
  ...QUESTIONS_INTERMEDIATE_EXTRA,
  ...QUESTIONS_VISUAL_MULTIGRADE,
  ...QUESTIONS_ADVANCED_LEVELS,
];

/**
 * دالة مساعدة لجلب الأسئلة المناسبة لصف دراسي معين
 */
export function getQuestionsByGrade(grade: GradeLevel): Question[] {
  return ALL_SYSTEM_QUESTIONS.filter((q) => q.gradeLevels.includes(grade));
}

/**
 * دالة مساعدة لمعرفة عدد الأسئلة المتاحة لكل صف دراسي
 */
export function getQuestionCountPerGrade(): Record<GradeLevel, number> {
  const grades: GradeLevel[] = [
    'g3_primary',
    'g4_primary',
    'g5_primary',
    'g6_primary',
    'g1_middle',
    'g2_middle',
    'g3_middle',
  ];

  const counts: Partial<Record<GradeLevel, number>> = {};
  grades.forEach((g) => {
    counts[g] = ALL_SYSTEM_QUESTIONS.filter((q) => q.gradeLevels.includes(g)).length;
  });

  return counts as Record<GradeLevel, number>;
}
