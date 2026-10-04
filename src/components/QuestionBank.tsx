import React, { useState, useMemo } from 'react';
import { 
  Question, 
  SkillCategory, 
  GradeLevel, 
  DifficultyLevel, 
  GRADE_LABELS, 
  SKILL_DEFINITIONS, 
  DIFFICULTY_LABELS,
  AppSettings
} from '../types';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  HelpCircle, 
  CheckCircle, 
  Layers, 
  Clock, 
  X, 
  FileCheck2, 
  Upload, 
  AlertCircle, 
  Printer, 
  FileDown,
  ArrowUpDown,
  Check,
  FileText,
  Sparkles,
  FileCheck,
  Presentation,
  Play,
  ChevronLeft,
  ChevronRight,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualShape } from './VisualShape';
import { SchoolLogo } from './SchoolLogo';

interface QuestionBankProps {
  questions: Question[];
  settings?: AppSettings;
  onOpenAddModal: () => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onDuplicateQuestion: (q: Question) => void;
  onBulkAddQuestions: (newQuestions: Question[]) => void;
  onOpenZipGrade?: (grade?: GradeLevel) => void;
}

export type QuestionSortOption = 
  | 'difficulty_asc' 
  | 'difficulty_desc' 
  | 'skill' 
  | 'grade' 
  | 'code' 
  | 'title';

export const QuestionBank: React.FC<QuestionBankProps> = ({
  questions,
  settings,
  onOpenAddModal,
  onEditQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onBulkAddQuestions,
  onOpenZipGrade,
}) => {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<QuestionSortOption>('difficulty_asc');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Training Mode State
  const [trainingModeActive, setTrainingModeActive] = useState(false);
  const [currentTrainingIdx, setCurrentTrainingIdx] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [trainingTimer, setTrainingTimer] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // PDF Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportTargetGrade, setExportTargetGrade] = useState<string>('all');
  const [exportGrouping, setExportGrouping] = useState<'difficulty' | 'skill' | 'flat'>('difficulty');
  const [exportColumns, setExportColumns] = useState<'1' | '2'>('2');
  const [exportAnswerPlacement, setExportAnswerPlacement] = useState<'end_table' | 'inline' | 'none'>('end_table');
  const [exportLimit, setExportLimit] = useState<number>(0);
  const [exportIncludeExplanations, setExportIncludeExplanations] = useState(false);
  const [exportPageBreakSection, setExportPageBreakSection] = useState(false);
  const [exportMinimalist, setExportMinimalist] = useState(false);

  // Bulk Add state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkGrades, setBulkGrades] = useState<GradeLevel[]>(['g3_primary']);
  const [bulkDifficulty, setBulkDifficulty] = useState<DifficultyLevel>('medium');
  const [bulkSkill, setBulkSkill] = useState<SkillCategory>('mental_flexibility');
  const [bulkError, setBulkError] = useState('');

  const handleBulkAdd = () => {
    if (!bulkInputText.trim()) {
      setBulkError('يرجى إدخال نصوص الأسئلة.');
      return;
    }

    const lines = bulkInputText.trim().split('\n');
    const newQuestions: Question[] = [];
    
    lines.forEach((line, idx) => {
      const parts = line.split(/[|\t]/).map(p => p.trim());
      if (parts.length >= 2) {
        const qText = parts[0];
        const optsText = parts[1].split(',').map(o => o.trim());
        const correctIdx = parseInt(parts[2] || '0') || 0;
        
        const customDiff = parts[3] as DifficultyLevel;
        const customSkill = parts[4] as SkillCategory;

        // Pad or trim options to exactly 4 as requested
        const finalOptions = Array(4).fill(null).map((_, i) => ({
          id: `opt_${i + 1}`,
          text: optsText[i] || `خيار احتياطي ${i + 1}`
        }));

        newQuestions.push({
          id: `bulk_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          code: `BQ-${Math.floor(1000 + Math.random() * 9000)}`,
          title: qText.substring(0, 30) + '...',
          questionText: qText,
          type: 'multiple_choice_4',
          options: finalOptions,
          correctOptionId: `opt_${(correctIdx % 4) + 1}`,
          explanation: 'إضافة تلقائية عبر الاستيراد الجماعي',
          skill: customSkill && SKILL_DEFINITIONS[customSkill] ? customSkill : bulkSkill,
          gradeLevels: bulkGrades.length > 0 ? bulkGrades : ['g3_primary'],
          difficulty: customDiff && DIFFICULTY_LABELS[customDiff] ? customDiff : bulkDifficulty,
          points: 5,
          estimatedTimeSeconds: 60,
          isExperimental: false,
          status: 'active',
          usageCount: 0,
          correctAnswersCount: 0,
        });
      }
    });

    if (newQuestions.length > 0) {
      onBulkAddQuestions(newQuestions);
      setIsBulkAddOpen(false);
      setBulkInputText('');
      setBulkError('');
      alert(`تم إضافة ${newQuestions.length} سؤال بنجاح!`);
    } else {
      setBulkError('تأكد من صياغة الأسطر بشكل صحيح: نص السؤال | خيار1, خيار2, خيار3, خيار4 | رقم الإجابة الصحيحة (0-3)');
    }
  };

  // Grade counts for coverage badges
  const gradeCounts = useMemo(() => {
    const counts: Record<GradeLevel, number> = {
      g3_primary: 0,
      g4_primary: 0,
      g5_primary: 0,
      g6_primary: 0,
      g1_middle: 0,
      g2_middle: 0,
      g3_middle: 0,
    };
    questions.forEach(q => {
      q.gradeLevels.forEach(gr => {
        if (counts[gr] !== undefined) counts[gr]++;
      });
    });
    return counts;
  }, [questions]);

  // Filtering Logic
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Search
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term ||
        q.title.toLowerCase().includes(term) ||
        q.questionText.toLowerCase().includes(term) ||
        q.code.toLowerCase().includes(term) ||
        (q.subSkill && q.subSkill.toLowerCase().includes(term));

      // Skill
      const matchesSkill = selectedSkill === 'all' || q.skill === selectedSkill;

      // Grade
      const matchesGrade = selectedGrade === 'all' || q.gradeLevels.includes(selectedGrade as GradeLevel);

      // Difficulty
      const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;

      return matchesSearch && matchesSkill && matchesGrade && matchesDiff;
    });
  }, [questions, searchTerm, selectedSkill, selectedGrade, selectedDifficulty]);

  // Weights for smart sorting
  const difficultyWeights: Record<DifficultyLevel, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    advanced: 4,
  };

  const skillWeights: Record<SkillCategory, number> = {
    mental_flexibility: 1,
    linguistic_reasoning: 2,
    math_reasoning: 3,
    spatial_visual: 4,
    scientific_mechanical: 5,
    problem_solving: 6,
  };

  const gradeWeights: Record<GradeLevel, number> = {
    g3_primary: 1,
    g4_primary: 2,
    g5_primary: 3,
    g6_primary: 4,
    g1_middle: 5,
    g2_middle: 6,
    g3_middle: 7,
  };

  const sortQuestionList = (list: Question[], sortKey: QuestionSortOption) => {
    return [...list].sort((a, b) => {
      if (sortKey === 'difficulty_asc') {
        const diffA = difficultyWeights[a.difficulty] || 2;
        const diffB = difficultyWeights[b.difficulty] || 2;
        if (diffA !== diffB) return diffA - diffB;
        return (skillWeights[a.skill] || 0) - (skillWeights[b.skill] || 0);
      }
      if (sortKey === 'difficulty_desc') {
        const diffA = difficultyWeights[a.difficulty] || 2;
        const diffB = difficultyWeights[b.difficulty] || 2;
        if (diffA !== diffB) return diffB - diffA;
        return (skillWeights[a.skill] || 0) - (skillWeights[b.skill] || 0);
      }
      if (sortKey === 'skill') {
        const skA = skillWeights[a.skill] || 0;
        const skB = skillWeights[b.skill] || 0;
        if (skA !== skB) return skA - skB;
        return (difficultyWeights[a.difficulty] || 2) - (difficultyWeights[b.difficulty] || 2);
      }
      if (sortKey === 'grade') {
        const grA = Math.min(...a.gradeLevels.map(g => gradeWeights[g] || 99));
        const grB = Math.min(...b.gradeLevels.map(g => gradeWeights[g] || 99));
        if (grA !== grB) return grA - grB;
        return (difficultyWeights[a.difficulty] || 2) - (difficultyWeights[b.difficulty] || 2);
      }
      if (sortKey === 'code') {
        return a.code.localeCompare(b.code, 'ar', { numeric: true });
      }
      if (sortKey === 'title') {
        return a.title.localeCompare(b.title, 'ar');
      }
      return 0;
    });
  };

  // Sorted list for UI display
  const sortedFilteredQuestions = useMemo(() => {
    return sortQuestionList(filteredQuestions, sortBy);
  }, [filteredQuestions, sortBy]);

  // Questions specifically selected for PDF export with strict deduplication
  const questionsToExport = useMemo(() => {
    let baseList = exportScope === 'filtered' ? filteredQuestions : questions;
    if (exportTargetGrade !== 'all') {
      baseList = baseList.filter(q => q.gradeLevels.includes(exportTargetGrade as GradeLevel));
    }

    // Strict deduplication by ID AND normalized question text to guarantee NO REPEATED QUESTIONS
    const seenIds = new Set<string>();
    const seenTexts = new Set<string>();
    const deduped: Question[] = [];

    for (const q of baseList) {
      const normText = q.questionText.trim().replace(/\s+/g, ' ');
      if (!seenIds.has(q.id) && !seenTexts.has(normText)) {
        seenIds.add(q.id);
        seenTexts.add(normText);
        deduped.push(q);
      }
    }

    const sorted = sortQuestionList(deduped, sortBy);
    if (exportLimit > 0) {
      return sorted.slice(0, exportLimit);
    }
    return sorted;
  }, [exportScope, exportTargetGrade, filteredQuestions, questions, sortBy, exportLimit]);

  // Statistics for PDF header / balance
  const exportStats = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0, advanced: 0 };
    const skillCounts: Record<string, number> = {};
    
    questionsToExport.forEach(q => {
      if (counts[q.difficulty] !== undefined) counts[q.difficulty]++;
      skillCounts[q.skill] = (skillCounts[q.skill] || 0) + 1;
    });
    
    return { difficulty: counts, skills: skillCounts };
  }, [questionsToExport]);

  const missingSkills = useMemo(() => {
    if (questionsToExport.length === 0) return [];
    return (Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).filter(sk => !exportStats.skills[sk]);
  }, [questionsToExport, exportStats]);

  // Trigger print with current settings
  const handleExecutePrint = () => {
    setIsExportModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Timer Effect
  React.useEffect(() => {
    let interval: any;
    if (isTimerRunning && trainingTimer !== null && trainingTimer > 0) {
      interval = setInterval(() => {
        setTrainingTimer(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
      }, 1000);
    } else if (trainingTimer === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, trainingTimer]);

  const startTraining = () => {
    if (sortedFilteredQuestions.length === 0) return;
    setCurrentTrainingIdx(0);
    setShowExplanation(false);
    setTrainingTimer(null);
    setIsTimerRunning(false);
    setTrainingModeActive(true);
  };

  const nextTrainingQ = () => {
    if (currentTrainingIdx < sortedFilteredQuestions.length - 1) {
      setCurrentTrainingIdx(prev => prev + 1);
      setShowExplanation(false);
      setTrainingTimer(null);
      setIsTimerRunning(false);
    }
  };

  const prevTrainingQ = () => {
    if (currentTrainingIdx > 0) {
      setCurrentTrainingIdx(prev => prev - 1);
      setShowExplanation(false);
      setTrainingTimer(null);
      setIsTimerRunning(false);
    }
  };

  return (
    <div>
      {/* ========================================================================= */}
      {/* 1. INTERACTIVE SCREEN UI - STRICTLY HIDDEN IN PRINT VIA no-print           */}
      {/* ========================================================================= */}
      <div className="space-y-6 no-print">
        {/* Top Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-sky-600" />
              <span>بنك الأسئلة المركزي المقنن</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إدارة وتصنيف الأسئلة حسب المهارات العقلية، المستويات، والمراحل الدراسية (إجمالي {questions.length} سؤالاً - المعروض وفق الفرز: {sortedFilteredQuestions.length})
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/20 transition-all cursor-pointer shrink-0"
              title="تصدير الأسئلة إلى PDF وفق الفرز والتصنيف المطلوب"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>تصدير PDF ({sortedFilteredQuestions.length})</span>
            </button>

            {onOpenZipGrade && (
              <button
                onClick={() => onOpenZipGrade(selectedGrade !== 'all' ? selectedGrade as GradeLevel : undefined)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                title="تجهيز وطباعة اختبار ورقي متوافق مع زيب جريد"
              >
                <FileCheck className="w-4 h-4" />
                <span>اختبار ورقي (ZipGrade)</span>
              </button>
            )}

            <button
              onClick={() => setIsBulkAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>إضافة جماعية</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سؤال جديد</span>
            </button>

            <button
              onClick={startTraining}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer shrink-0"
              title="بدء عرض التدريب الصفي التفاعلي للأسئلة المعروضة"
            >
              <Presentation className="w-4 h-4" />
              <span>بدء عرض التدريب ({sortedFilteredQuestions.length})</span>
            </button>
          </div>
        </div>

        {/* Grade Coverage Ribbon */}
        <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-800/90 p-4 rounded-3xl border border-sky-200/70 dark:border-slate-700 shadow-xs space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>تغطية بنك الأسئلة للمراحل الدراسية (الحد الأدنى: 30 سؤالاً منوعاً لكل صف)</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>كافة الصفوف مكتملة وتتجاوز 30 سؤالاً</span>
              </span>
            </div>

            {/* Quick Filter Grade Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedGrade('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedGrade === 'all'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/70 dark:border-slate-600'
                }`}
              >
                الكل ({questions.length})
              </button>

              {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(gr => {
                const count = gradeCounts[gr] || 0;
                const isSelected = selectedGrade === gr;
                return (
                  <button
                    key={gr}
                    onClick={() => setSelectedGrade(gr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/70 dark:border-slate-600'
                    }`}
                  >
                    <span>{GRADE_LABELS[gr]}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : count >= 30 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Filter Ribbon */}
          <div className="space-y-3 pt-2 border-t border-sky-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>تصنيف مستوى الصعوبة:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedDifficulty('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedDifficulty === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/70 dark:border-slate-600'
                }`}
              >
                كافة المستويات ({questions.length})
              </button>
              {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map(lvl => {
                const isSelected = selectedDifficulty === lvl;
                const count = questions.filter(q => q.difficulty === lvl).length;
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedDifficulty(lvl)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/70 dark:border-slate-600'
                    }`}
                  >
                    <span>{DIFFICULTY_LABELS[lvl].label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث بالرمز أو الكلمات..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Skill Filter */}
            <div>
              <select
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">كافة المهارات العقلية</option>
                {(Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).map(sk => (
                  <option key={sk} value={sk}>{SKILL_DEFINITIONS[sk].name}</option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">كافة المراحل والصفوف</option>
                {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(gr => (
                  <option key={gr} value={gr}>{GRADE_LABELS[gr]}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">كافة مستويات الصعوبة</option>
                {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map(lvl => (
                  <option key={lvl} value={lvl}>{DIFFICULTY_LABELS[lvl].label}</option>
                ))}
              </select>
            </div>

            {/* Sort By Option */}
            <div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as QuestionSortOption)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-bold"
              >
                <option value="difficulty_asc">ترتيب: من الأسهل للأصعب (متوازن)</option>
                <option value="difficulty_desc">ترتيب: من الأصعب للأسهل</option>
                <option value="skill">ترتيب: حسب المهارة العقلية</option>
                <option value="grade">ترتيب: حسب الصف الدراسي</option>
                <option value="code">ترتيب: حسب رمز السؤال</option>
                <option value="title">ترتيب: أبجدياً</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Bar Summary */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">النتائج المعروضة:</span>
            <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
              {sortedFilteredQuestions.length} سؤالاً
            </span>
            {selectedGrade !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-medium">
                الصف: {GRADE_LABELS[selectedGrade as GradeLevel]}
              </span>
            )}
            {selectedDifficulty !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-medium">
                الصعوبة: {DIFFICULTY_LABELS[selectedDifficulty as DifficultyLevel]?.label}
              </span>
            )}
            {selectedSkill !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-medium">
                المهارة: {SKILL_DEFINITIONS[selectedSkill as SkillCategory]?.name}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              setSelectedGrade('all');
              setSelectedDifficulty('all');
              setSelectedSkill('all');
              setSearchTerm('');
              setSortBy('difficulty_asc');
            }}
            className="text-sky-600 hover:text-sky-700 text-xs font-bold hover:underline"
          >
            إعادة تعيين الفرز
          </button>
        </div>

        {/* Questions Grid (On Screen) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedFilteredQuestions.map((q, idx) => {
            const skillDef = SKILL_DEFINITIONS[q.skill];
            const diffInfo = DIFFICULTY_LABELS[q.difficulty];
            const successPct = q.usageCount > 0 ? Math.round((q.correctAnswersCount / q.usageCount) * 100) : 0;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-sky-300 dark:hover:border-sky-700 transition-all"
              >
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {q.code}
                      </span>
                      <span 
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${skillDef?.color}15`, 
                          color: skillDef?.color 
                        }}
                      >
                        {skillDef?.name}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${diffInfo.color}`}>
                      {diffInfo.label}
                    </span>
                  </div>

                  {/* Question Title & Text */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {q.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {q.questionText}
                    </p>
                  </div>

                  {/* Visual Graphic Thumbnail Preview */}
                  {(q.svgGraphic || q.imageUrl) && (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                      {q.svgGraphic && (
                        <VisualShape type={q.svgGraphic} size={130} />
                      )}
                      {q.imageUrl && !q.svgGraphic && (
                        <img src={q.imageUrl} alt="شكل السؤال" referrerPolicy="no-referrer" className="max-h-24 object-contain rounded" />
                      )}
                    </div>
                  )}

                  {/* Target Grades Pills */}
                  <div className="flex flex-wrap gap-1">
                    {q.gradeLevels.map(gr => (
                      <span 
                        key={gr}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400"
                      >
                        {GRADE_LABELS[gr]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{q.points} درجات</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{q.estimatedTimeSeconds}ث</span>
                    </span>
                    {q.usageCount > 0 && (
                      <span className="text-[10px] text-sky-600 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded">
                        نسبة الحل: {successPct}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="معاينة السؤال وحله"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDuplicateQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="نسخ السؤال"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="تعديل السؤال"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة؟')) {
                          onDeleteQuestion(q.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sortedFilteredQuestions.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              لم يتم العثور على أسئلة مطابقة للبحث أو التصفية
            </h3>
            <p className="text-xs text-slate-500">
              جرب إعادة تعيين خيارات التصفية أو أضف سؤالاً جديداً للبنك
            </p>
          </div>
        )}

        {/* Export Customization Modal */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-sky-600" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    تصدير الأسئلة إلى PDF للمراجعة
                  </h3>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scope & Target Grade Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  1. نطاق والصف المستهدف للتصدير:
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setExportScope('filtered')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      exportScope === 'filtered'
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs mb-1">
                      <span>الأسئلة المفلترة حالياً بالشاشة</span>
                      <span className="px-2 py-0.5 rounded bg-sky-200 dark:bg-sky-800 text-[10px]">
                        {filteredQuestions.length} سؤال
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      يصدر فقط الأسئلة المطابقة للفرز النشط (الصف: {selectedGrade === 'all' ? 'الكل' : GRADE_LABELS[selectedGrade as GradeLevel]})
                    </p>
                  </div>

                  <div
                    onClick={() => setExportScope('all')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      exportScope === 'all'
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs mb-1">
                      <span>كافة بنك الأسئلة المعتمد</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">
                        {questions.length} سؤال
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      تصدير بنك الأسئلة بالكامل مع إمكانية التحديد أدناه.
                    </p>
                  </div>
                </div>

                {/* Grade and Count Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تخصيص الصف الدراسي المستهدف:
                    </label>
                    <select
                      value={exportTargetGrade}
                      onChange={e => setExportTargetGrade(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="all">كافة الصفوف (أو وفق التصفية الحالية)</option>
                      {Object.entries(GRADE_LABELS).map(([gKey, gLabel]) => (
                        <option key={gKey} value={gKey}>{gLabel}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الحد الأقصى لعدد الأسئلة:
                    </label>
                    <select
                      value={exportLimit}
                      onChange={e => setExportLimit(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value={0}>كل الأسئلة المتاحة بدون حد</option>
                      <option value={10}>أول 10 أسئلة (اختبار سريع)</option>
                      <option value={20}>أول 20 سؤالاً (نموذج زيب جريد 20)</option>
                      <option value={30}>أول 30 سؤالاً (نموذج موحد مقنن)</option>
                      <option value={50}>أول 50 سؤالاً (نموذج شامل 50)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Layout Density & Columns */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                  2. تنسيق الصفحة وكثافة الأسئلة (لضمان طباعة احترافية واقتصادية):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    onClick={() => setExportColumns('2')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportColumns === '2'
                        ? 'bg-sky-50 border-sky-500 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100 font-bold ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span>عمودين (فائق الكثافة والتوفير)</span>
                      <span className="text-[10px] text-sky-600 font-bold">موصى به ⭐</span>
                    </div>
                    <p className="text-[10px] opacity-75 font-normal">
                      يستوعب من 6 إلى 8 أسئلة في الصفحة الواحدة بشكل منظم ومريح للعين
                    </p>
                  </div>

                  <div
                    onClick={() => setExportColumns('1')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportColumns === '1'
                        ? 'bg-sky-50 border-sky-500 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100 font-bold ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span>عمود واحد مضغوط</span>
                    </div>
                    <p className="text-[10px] opacity-75 font-normal">
                      يستوعب من 3 إلى 4 أسئلة في الصفحة مع خطوط وصور أكبر حجماً
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={exportMinimalist}
                      onChange={e => setExportMinimalist(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600"
                    />
                    <span>تنسيق بسيط (Minimalist): إخفاء الأكواد ومستويات الصعوبة لتقليل النصوص</span>
                  </label>
                </div>
              </div>

              {/* Skill Coverage Analysis */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                  4. تحليل شمولية المهارات في التصدير:
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).map(sk => {
                    const count = exportStats.skills[sk] || 0;
                    const isMissing = count === 0;
                    return (
                      <div key={sk} className={`px-2 py-1.5 rounded-lg border text-[9px] font-bold flex items-center justify-between ${
                        isMissing ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        <span className="truncate">{SKILL_DEFINITIONS[sk].name}</span>
                        <span>{count}</span>
                      </div>
                    );
                  })}
                </div>

                {missingSkills.length > 0 && questionsToExport.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>تنبيه: التصدير الحالي يفتقد لمهارات ({missingSkills.map(sk => SKILL_DEFINITIONS[sk].name).join('، ')}). ينصح بتنويع الأسئلة.</span>
                  </div>
                )}
              </div>

              {/* Answers Placement */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                  3. مفتاح الإجابات والحلول في التقرير المطبوع:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div
                    onClick={() => setExportAnswerPlacement('end_table')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportAnswerPlacement === 'end_table'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100 font-bold ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="block mb-0.5">جدول مفتاح الحلول بنهاية الملف</span>
                    <p className="text-[9.5px] opacity-75 font-normal">
                      الأسئلة بدون حل، مع جدول مفتاح إجابات معتمد في الصفحة الأخيرة (مثالي للاختبارات)
                    </p>
                  </div>

                  <div
                    onClick={() => setExportAnswerPlacement('inline')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportAnswerPlacement === 'inline'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 dark:bg-indigo-950/60 dark:text-indigo-100 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="block mb-0.5">الحلول والتفسيرات أسفل كل سؤال</span>
                    <p className="text-[9.5px] opacity-75 font-normal">
                      نسخة المعلم والمشرف للمراجعة والتدقيق التربوي
                    </p>
                  </div>

                  <div
                    onClick={() => setExportAnswerPlacement('none')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportAnswerPlacement === 'none'
                        ? 'bg-slate-100 border-slate-500 text-slate-900 dark:bg-slate-800 dark:text-white font-bold ring-1 ring-slate-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="block mb-0.5">بدون إجابات إطلاقاً</span>
                    <p className="text-[9.5px] opacity-75 font-normal">
                      نسخة مخصصة لتوزيعها على الطلاب كاختبار ورقي
                    </p>
                  </div>
                </div>

                {exportAnswerPlacement === 'inline' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={exportIncludeExplanations}
                      onChange={e => setExportIncludeExplanations(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span>تضمين التفسير العلمي وشرح النمط العقلي أسفل السؤال</span>
                  </label>
                )}
              </div>

              {/* Sorting & Grouping Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    4. ترتيب الأسئلة في ملف PDF:
                  </label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as QuestionSortOption)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="difficulty_asc">من الأسهل للأصعب (متوازن تربوياً)</option>
                    <option value="difficulty_desc">من الأصعب للأسهل</option>
                    <option value="skill">حسب المهارة العقلية</option>
                    <option value="grade">حسب الصف الدراسي</option>
                    <option value="code">حسب رمز السؤال التسلسلي</option>
                    <option value="title">أبجدياً</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    5. طريقة التبويب في التقرير:
                  </label>
                  <select
                    value={exportGrouping}
                    onChange={e => setExportGrouping(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="difficulty">تبويب بأقسام مستوى الصعوبة (سهل، متوسط، صعب)</option>
                    <option value="skill">تبويب بأقسام المهارات العقلية الست</option>
                    <option value="flat">قائمة تسلسلية موحدة ومباشرة (أنسب لكتيب الاختبار)</option>
                  </select>
                </div>
              </div>

              {/* Page Break Setting */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={exportPageBreakSection}
                  onChange={e => setExportPageBreakSection(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>إضافة فاصل صفحة تلقائي جديد عند بداية كل قسم / مهارة</span>
              </label>

              {/* Balance Preview Badge */}
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold block">جاهزية التقرير للتصدير:</span>
                  <span className="text-[11px] opacity-80">
                    إجمالي {questionsToExport.length} سؤالاً بدون أي تكرار (سهل: {exportStats.difficulty.easy} | متوسط: {exportStats.difficulty.medium} | صعب: {exportStats.difficulty.hard})
                  </span>
                </div>
                <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleExecutePrint}
                  className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>حفظ وطباعة كملف PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Add Modal */}
        {isBulkAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    إضافة مجموعة أسئلة دفعة واحدة
                  </h3>
                </div>
                <button
                  onClick={() => setIsBulkAddOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bulkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{bulkError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2">الصفوف المستهدفة</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(gr => (
                      <button
                        key={gr}
                        type="button"
                        onClick={() => {
                          setBulkGrades(prev => 
                            prev.includes(gr) ? prev.filter(g => g !== gr) : [...prev, gr]
                          );
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                          bulkGrades.includes(gr)
                            ? 'bg-sky-600 border-sky-700 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-300'
                        }`}
                      >
                        {GRADE_LABELS[gr]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">مستوى الصعوبة الافتراضي</label>
                    <select
                      value={bulkDifficulty}
                      onChange={e => setBulkDifficulty(e.target.value as DifficultyLevel)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map(lvl => (
                        <option key={lvl} value={lvl}>{DIFFICULTY_LABELS[lvl].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">المهارة الرئيسية الافتراضية</label>
                    <select
                      value={bulkSkill}
                      onChange={e => setBulkSkill(e.target.value as SkillCategory)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {(Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).map(sk => (
                        <option key={sk} value={sk}>{SKILL_DEFINITIONS[sk].name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500">
                  أدخل الأسئلة (سطر لكل سؤال):
                </label>
                <textarea
                  rows={6}
                  value={bulkInputText}
                  onChange={e => setBulkInputText(e.target.value)}
                  placeholder="ما هو ناتج 5+5؟ | 10, 15, 20, 25 | 0&#10;ما هي عاصمة السعودية؟ | جدة, الرياض, مكة, الدمام | 1"
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsBulkAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleBulkAdd}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  إضافة الأسئلة الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Question Modal */}
        {previewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                    {previewQuestion.code}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {previewQuestion.title}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {previewQuestion.questionText}
                </p>

                {(previewQuestion.imageUrl || previewQuestion.svgGraphic) && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-center">
                    {previewQuestion.svgGraphic && (
                      <VisualShape type={previewQuestion.svgGraphic} size={220} />
                    )}
                    {previewQuestion.imageUrl && (
                      <img src={previewQuestion.imageUrl} alt="شكل السؤال" referrerPolicy="no-referrer" className="max-h-52 object-contain rounded-lg" />
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    الخيارات المعروضة للطالب:
                  </span>
                  {previewQuestion.options.map((opt, idx) => {
                    const isCorrect = previewQuestion.correctOptionId === opt.id;
                    const letter = ['أ', 'ب', 'ج', 'د'][idx] || `${idx + 1}`;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
                          }`}>
                            {letter}
                          </span>
                          <span>{opt.text}</span>
                          {opt.imageUrl && (
                            <div className="mr-2">
                              <img src={opt.imageUrl} alt="" referrerPolicy="no-referrer" className="h-10 max-w-[80px] object-contain rounded border border-slate-200 dark:border-slate-700 bg-white" />
                            </div>
                          )}
                          {opt.svgShape && (
                            <div className="mr-2">
                              <VisualShape type={opt.svgShape} size={40} />
                            </div>
                          )}
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                            الإجابة المعتمدة ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {previewQuestion.explanation && (
                  <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                    <span className="font-bold block">التفسير العلمي للإجابة:</span>
                    <p>{previewQuestion.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PRINT-ONLY PUBLICATION-GRADE BOOKLET TEMPLATE                          */}
      {/* Strictly static normal flow, NO overlay, NO duplicate pages               */}
      {/* ========================================================================= */}
      <div 
        className="hidden print:block w-full bg-white text-black p-0 m-0" 
        dir="rtl"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        {/* Page 1 Header - Compact & Official */}
        <div className="border-b-2 border-slate-900 pb-3 mb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 text-[10px] font-bold leading-tight text-slate-800">
              <div>المملكة العربية السعودية</div>
              <div>وزارة التعليم</div>
              <div>الإدارة العامة للتعليم بمنطقة الرياض</div>
              <div className="font-black text-slate-900 text-xs">{settings?.schoolName || 'مدارس رياض الإبداع الأهلية'}</div>
              <div>قسم رعاية الموهوبين والمبدعين</div>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center">
                <SchoolLogo size={42} />
              </div>
              <div className="text-xs font-black text-slate-900">
                {settings?.platformName || 'منصة الموهوبين'}
              </div>
              <div className="text-[9px] text-slate-600 font-bold">
                بنك الأسئلة المقننة المعتمد
              </div>
            </div>

            <div className="space-y-0.5 text-[10px] text-slate-700 text-left" dir="ltr">
              <div className="font-mono text-[9px]">التاريخ: {new Date().toLocaleDateString('ar-SA')}</div>
              <div className="font-mono text-[9px]">الوقت: {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="font-bold text-slate-900 text-right" dir="rtl">
                منسق الموهوبين: أسامة ابراهيم
              </div>
              <div className="text-[9px] text-slate-600 text-right" dir="rtl">
                المشرف: {settings?.supervisorName || 'أ. أسامة ابراهيم'}
              </div>
            </div>
          </div>

          {/* Compact 1-line metadata bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] bg-slate-50 p-2 rounded-lg border">
            <div>
              <span className="text-slate-500 font-bold">الصف المستهدف: </span>
              <strong className="text-slate-900 font-black">
                {selectedGrade === 'all' ? 'كافة المراحل والصفوف' : GRADE_LABELS[selectedGrade as GradeLevel]}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 font-bold">مستوى الصعوبة: </span>
              <strong className="text-slate-900 font-black">
                {selectedDifficulty === 'all' ? 'كافة المستويات' : DIFFICULTY_LABELS[selectedDifficulty as DifficultyLevel]?.label}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 font-bold">إجمالي الأسئلة: </span>
              <strong className="text-slate-900 font-black font-mono">
                {questionsToExport.length} سؤالاً
              </strong>
            </div>

            <div className="flex items-center gap-2 font-mono font-bold text-[9px]">
              <span className="text-emerald-800">سهل: {exportStats.difficulty.easy}</span>
              <span>|</span>
              <span className="text-sky-800">متوسط: {exportStats.difficulty.medium}</span>
              <span>|</span>
              <span className="text-amber-800">صعب: {exportStats.difficulty.hard}</span>
            </div>
          </div>

          {/* Student metadata filling strip */}
          <div className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-[10px] bg-slate-50/80 p-1.5 rounded border border-slate-300">
            <span>اسم الطالب: ................................................................</span>
            <span>الصف: {exportTargetGrade !== 'all' ? GRADE_LABELS[exportTargetGrade as GradeLevel] : (selectedGrade !== 'all' ? GRADE_LABELS[selectedGrade as GradeLevel] : '....................')}</span>
            <span>الفصل: ..........</span>
            <span>رقم الجلوس: ....................</span>
          </div>
        </div>

        {/* QUESTIONS LIST ACCORDING TO GROUPING */}
        {exportGrouping === 'difficulty' && (
          <div className="space-y-4">
            {(['easy', 'medium', 'hard', 'advanced'] as DifficultyLevel[]).map(diffKey => {
              const diffQs = questionsToExport.filter(q => q.difficulty === diffKey);
              if (diffQs.length === 0) return null;

              return (
                <div key={diffKey} className={`space-y-2 ${exportPageBreakSection ? 'print-break-before' : ''}`}>
                  <div className="px-3 py-1 rounded bg-slate-100 border-r-4 border-slate-900 flex items-center justify-between print-avoid-break">
                    <h2 className="text-xs font-black text-slate-900">
                      مستوى الصعوبة: {DIFFICULTY_LABELS[diffKey].label} ({diffQs.length} سؤال)
                    </h2>
                    <span className="text-[10px] font-bold text-slate-600">
                      مقياس التدرج المعتمد
                    </span>
                  </div>

                  <div className={exportColumns === '2' ? 'print-grid-2' : 'space-y-2'}>
                    {diffQs.map((q, idx) => (
                      <PrintQuestionCard 
                        key={q.id} 
                        question={q} 
                        index={idx + 1} 
                        columns={exportColumns}
                        minimalist={exportMinimalist}
                        includeAnswers={exportAnswerPlacement === 'inline'} 
                        includeExplanations={exportAnswerPlacement === 'inline' && exportIncludeExplanations} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {exportGrouping === 'skill' && (
          <div className="space-y-4">
            {(Object.entries(SKILL_DEFINITIONS) as [SkillCategory, any][]).map(([skillKey, def]) => {
              const skillQs = questionsToExport.filter(q => q.skill === skillKey);
              if (skillQs.length === 0) return null;

              return (
                <div key={skillKey} className={`space-y-2 ${exportPageBreakSection ? 'print-break-before' : ''}`}>
                  <div className="px-3 py-1 rounded bg-slate-100 border-r-4 border-slate-900 flex items-center justify-between print-avoid-break" style={{ borderColor: def.color }}>
                    <h2 className="text-xs font-black text-slate-900">
                      المجال العقلي: {def.name} ({skillQs.length} سؤال)
                    </h2>
                    <span className="text-[10px] font-bold text-slate-600">
                      {def.description}
                    </span>
                  </div>

                  <div className={exportColumns === '2' ? 'print-grid-2' : 'space-y-2'}>
                    {skillQs.map((q, idx) => (
                      <PrintQuestionCard 
                        key={q.id} 
                        question={q} 
                        index={idx + 1} 
                        columns={exportColumns}
                        minimalist={exportMinimalist}
                        includeAnswers={exportAnswerPlacement === 'inline'} 
                        includeExplanations={exportAnswerPlacement === 'inline' && exportIncludeExplanations} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {exportGrouping === 'flat' && (
          <div className={exportColumns === '2' ? 'print-grid-2' : 'space-y-2'}>
            {questionsToExport.map((q, idx) => (
              <PrintQuestionCard 
                key={q.id} 
                question={q} 
                index={idx + 1} 
                columns={exportColumns}
                minimalist={exportMinimalist}
                includeAnswers={exportAnswerPlacement === 'inline'} 
                includeExplanations={exportAnswerPlacement === 'inline' && exportIncludeExplanations} 
              />
            ))}
          </div>
        )}

        {/* Dedicated Answer Key Table at the End if Selected */}
        {exportAnswerPlacement === 'end_table' && (
          <div className="print-break-before mt-4 pt-3 border-t-2 border-slate-900 print-avoid-break">
            <div className="text-center mb-2">
              <h3 className="text-xs font-black text-slate-900">جدول مفتاح الحلول المعتمد (Answer Key Sheet)</h3>
              <p className="text-[9px] text-slate-600">
                مرجع تصحيح ومراجعة بنك الأسئلة - {settings?.schoolName || 'مدارس رياض الإبداع الأهلية'} ({questionsToExport.length} سؤالاً)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[9px]">
              {[0, 1].map(colIdx => {
                const halfCount = Math.ceil(questionsToExport.length / 2);
                const colQuestions = questionsToExport.slice(colIdx * halfCount, (colIdx + 1) * halfCount);
                if (colQuestions.length === 0) return null;

                return (
                  <table key={colIdx} className="w-full border-collapse border border-slate-400 text-right">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-black">
                        <th className="border border-slate-400 p-1 text-center w-8">#</th>
                        <th className="border border-slate-400 p-1 w-16">الكود</th>
                        <th className="border border-slate-400 p-1">المجال العقلي</th>
                        <th className="border border-slate-400 p-1 text-center w-14">الصعوبة</th>
                        <th className="border border-slate-400 p-1 text-center w-14">الحل الصحيح</th>
                        <th className="border border-slate-400 p-1 text-center w-10">الدرجة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colQuestions.map((q, rIdx) => {
                        const globalIdx = colIdx * halfCount + rIdx + 1;
                        const correctOptIdx = q.options.findIndex(opt => opt.id === q.correctOptionId);
                        const letterArabic = ['أ', 'ب', 'ج', 'د'][correctOptIdx] || 'أ';
                        const letterLatin = ['A', 'B', 'C', 'D'][correctOptIdx] || 'A';
                        const diffInfo = DIFFICULTY_LABELS[q.difficulty];
                        const skillDef = SKILL_DEFINITIONS[q.skill];

                        return (
                          <tr key={q.id} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="border border-slate-300 p-1 text-center font-bold">{globalIdx}</td>
                            <td className="border border-slate-300 p-1 font-mono text-[8px]">{q.code}</td>
                            <td className="border border-slate-300 p-1 font-bold">{skillDef?.name}</td>
                            <td className="border border-slate-300 p-1 text-center">{diffInfo?.label}</td>
                            <td className="border border-slate-300 p-1 text-center font-black">
                              <span className="bg-slate-900 text-white px-1 py-0.5 rounded text-[8px] ml-1">{letterArabic}</span>
                              <span className="font-mono text-[8px]">({letterLatin})</span>
                            </td>
                            <td className="border border-slate-300 p-1 text-center font-mono">{q.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })}
            </div>
          </div>
        )}

        {/* Official Footer - STRICTLY Gifted Coordinator & School Principal ONLY - No approval, No signature */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-center justify-between text-xs font-black text-slate-900 print-avoid-break">
          <div>منسق الموهوبين: {settings?.supervisorName || 'أ. أسامة إبراهيم'}</div>
          <div>مدير المدرسة: {settings?.principalName || 'أ. ماجد بن سعد الخثعمي'}</div>
        </div>
        {/* 2. FULL SCREEN TRAINING OVERLAY */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {trainingModeActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900 flex flex-col text-white overflow-hidden"
            >
              {/* Training Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20">
                    <Presentation className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">جلسة التدريب الصفي التفاعلية</h2>
                    <p className="text-xs text-slate-400 font-bold">
                      السؤال {currentTrainingIdx + 1} من {sortedFilteredQuestions.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Timer UI */}
                  <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-2xl border border-white/5">
                    <Timer className={`w-5 h-5 ${isTimerRunning ? 'text-orange-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className="text-2xl font-mono font-bold tracking-wider">
                      {trainingTimer !== null ? `${Math.floor(trainingTimer / 60)}:${(trainingTimer % 60).toString().padStart(2, '0')}` : '--:--'}
                    </span>
                    <div className="flex gap-1 ml-2">
                      <button 
                        onClick={() => {
                          setTrainingTimer(60);
                          setIsTimerRunning(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-[10px] font-bold"
                      >
                        60ث
                      </button>
                      <button 
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`p-1.5 rounded-lg transition-colors text-[10px] font-bold ${isTimerRunning ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      >
                        {isTimerRunning ? 'إيقاف' : 'بدء'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setTrainingModeActive(false)}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-white/10 group"
                  >
                    <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Training Body */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="max-w-6xl mx-auto space-y-12">
                  {/* Question Display */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 rounded-full bg-sky-500/20 text-sky-400 text-sm font-black border border-sky-500/30">
                        {SKILL_DEFINITIONS[sortedFilteredQuestions[currentTrainingIdx].skill].name}
                      </span>
                      <span className="px-4 py-1.5 rounded-full bg-white/5 text-slate-400 text-sm font-bold border border-white/5 font-mono">
                        {sortedFilteredQuestions[currentTrainingIdx].code}
                      </span>
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-black leading-tight text-white drop-shadow-sm">
                      {sortedFilteredQuestions[currentTrainingIdx].questionText}
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                      {/* Options Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        {sortedFilteredQuestions[currentTrainingIdx].options.map((opt, i) => {
                          const isCorrect = sortedFilteredQuestions[currentTrainingIdx].correctOptionId === opt.id;
                          const letter = ['أ', 'ب', 'ج', 'د'][i];
                          return (
                            <motion.div
                              key={opt.id}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-6 ${
                                showExplanation && isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                                showExplanation && isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white/10 text-white'
                              }`}>
                                {letter}
                              </div>
                              <span className="text-2xl font-bold">{opt.text}</span>
                              {showExplanation && isCorrect && (
                                <motion.span 
                                  initial={{ scale: 0 }} 
                                  animate={{ scale: 1 }}
                                  className="mr-auto bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-black"
                                >
                                  الإجابة الصحيحة
                                </motion.span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Graphic Column */}
                      {(sortedFilteredQuestions[currentTrainingIdx].svgGraphic || sortedFilteredQuestions[currentTrainingIdx].imageUrl) && (
                        <div className="bg-white rounded-[40px] p-8 flex items-center justify-center shadow-2xl">
                          {sortedFilteredQuestions[currentTrainingIdx].svgGraphic ? (
                            <VisualShape type={sortedFilteredQuestions[currentTrainingIdx].svgGraphic} size={400} />
                          ) : (
                            <img 
                              src={sortedFilteredQuestions[currentTrainingIdx].imageUrl} 
                              alt="Question Graphic" 
                              className="max-h-[500px] object-contain"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explanation Section */}
                  <AnimatePresence>
                    {showExplanation && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="p-10 rounded-[40px] bg-indigo-500/10 border border-indigo-500/30 space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-8 h-8 text-indigo-400" />
                          <h3 className="text-2xl font-black text-indigo-400">استراتيجية الحل والتفكير المنطقي</h3>
                        </div>
                        <p className="text-2xl text-slate-200 leading-relaxed font-bold">
                          {sortedFilteredQuestions[currentTrainingIdx].explanation || "لا يوجد شرح متاح لهذا السؤال حالياً."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Training Footer Controls */}
              <div className="p-8 border-t border-white/10 bg-slate-900 flex items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={prevTrainingQ}
                    disabled={currentTrainingIdx === 0}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all font-black text-xl border border-white/10"
                  >
                    <ChevronRight className="w-6 h-6" />
                    <span>السؤال السابق</span>
                  </button>
                  <button
                    onClick={nextTrainingQ}
                    disabled={currentTrainingIdx === sortedFilteredQuestions.length - 1}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all font-black text-xl border border-white/10"
                  >
                    <span>السؤال التالي</span>
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>

                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className={`flex items-center gap-3 px-12 py-5 rounded-3xl font-black text-2xl transition-all shadow-xl ${
                    showExplanation
                      ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-orange-500 text-white shadow-orange-500/20'
                  }`}
                >
                  {showExplanation ? (
                    <>
                      <Eye className="w-7 h-7" />
                      <span>إخفاء الحل</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-7 h-7" />
                      <span>كشف الحل والاستراتيجية</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/**
 * Compact, High-Density Printable Question Card
 * Designed to fit 6-8 questions per A4 page in 2-column mode cleanly without clutter or overflow
 */
interface PrintQuestionCardProps {
  question: Question;
  index: number;
  columns?: '1' | '2';
  minimalist?: boolean;
  includeAnswers: boolean;
  includeExplanations: boolean;
}

export const PrintQuestionCard: React.FC<PrintQuestionCardProps> = ({
  question,
  index,
  columns = '2',
  minimalist = false,
  includeAnswers,
  includeExplanations
}) => {
  const skillDef = SKILL_DEFINITIONS[question.skill];
  const diffInfo = DIFFICULTY_LABELS[question.difficulty];
  const isTwoCol = columns === '2';

  return (
    <div className={`border border-slate-300 rounded p-2 print-avoid-break bg-white text-black mb-1.5 ${isTwoCol ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
      {/* Header Line */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1 font-bold">
        <div className="flex items-center gap-1.5">
          <span className="bg-slate-900 text-white font-black px-1.5 py-0.2 rounded text-[9px]">
            سؤال {index}
          </span>
          <span className="font-bold text-slate-900 truncate max-w-[200px]">
            {question.title}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <p className="font-bold text-slate-900 leading-snug mb-1">
        {question.questionText}
      </p>

      {/* Graphic / Illustration - Scaled for column width */}
      {(question.svgGraphic || question.imageUrl) && (
        <div className="py-0.5 px-1 border border-slate-100 rounded flex justify-center bg-slate-50/50 my-1">
          {question.svgGraphic && (
            <VisualShape type={question.svgGraphic} size={isTwoCol ? 75 : 105} />
          )}
          {question.imageUrl && !question.svgGraphic && (
            <img 
              src={question.imageUrl} 
              alt="شكل السؤال" 
              referrerPolicy="no-referrer" 
              className={`${isTwoCol ? 'max-h-14' : 'max-h-20'} object-contain rounded`} 
            />
          )}
        </div>
      )}

      {/* Options in Compact 2x2 Grid */}
      <div className="grid grid-cols-2 gap-1 pt-0.5">
        {question.options.map((opt, oIdx) => {
          const isCorrect = includeAnswers && question.correctOptionId === opt.id;
          const letter = ['أ', 'ب', 'ج', 'د'][oIdx] || `${oIdx + 1}`;

          return (
            <div
              key={opt.id}
              className={`p-1 px-1.5 rounded border flex items-center justify-between text-[9px] ${
                isCorrect 
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-1 ring-emerald-500' 
                  : 'border-slate-300 bg-white text-slate-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 ${
                  isCorrect ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {letter}
                </span>
                <span className="leading-tight truncate">{opt.text}</span>
                {opt.imageUrl && (
                  <div className="mr-0.5 shrink-0">
                    <img src={opt.imageUrl} alt="" referrerPolicy="no-referrer" className="h-6 w-6 object-contain rounded border border-slate-200 bg-white" />
                  </div>
                )}
                {opt.svgShape && (
                  <div className="mr-0.5 shrink-0">
                    <VisualShape type={opt.svgShape} size={20} />
                  </div>
                )}
              </div>

              {isCorrect && (
                <span className="text-[7.5px] text-emerald-800 font-black mr-1 shrink-0">
                  ✓ صحيح
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact 1-line Explanation if enabled */}
      {includeExplanations && question.explanation && (
        <div className="text-[8.5px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mt-1 font-medium leading-tight">
          💡 <strong>التفسير:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
};

