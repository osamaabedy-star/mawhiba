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
  Sparkles
} from 'lucide-react';
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
}) => {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<QuestionSortOption>('difficulty_asc');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // PDF Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportGrouping, setExportGrouping] = useState<'difficulty' | 'skill' | 'flat'>('difficulty');
  const [exportIncludeAnswers, setExportIncludeAnswers] = useState(true);
  const [exportIncludeExplanations, setExportIncludeExplanations] = useState(true);

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

        const options = optsText.map((ot, i) => ({
          id: `opt_${i + 1}`,
          text: ot
        }));

        newQuestions.push({
          id: `bulk_q_${Date.now()}_${idx}`,
          code: `BQ-${Math.floor(1000 + Math.random() * 9000)}`,
          title: qText.substring(0, 30) + '...',
          questionText: qText,
          type: options.length === 4 ? 'multiple_choice_4' : 'multiple_choice_3',
          options,
          correctOptionId: `opt_${correctIdx + 1}`,
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

  // Questions specifically selected for PDF export
  const questionsToExport = useMemo(() => {
    const baseList = exportScope === 'filtered' ? filteredQuestions : questions;
    return sortQuestionList(baseList, sortBy);
  }, [exportScope, filteredQuestions, questions, sortBy]);

  // Statistics for PDF header / balance
  const exportStats = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0, advanced: 0 };
    questionsToExport.forEach(q => {
      if (counts[q.difficulty] !== undefined) counts[q.difficulty]++;
    });
    return counts;
  }, [questionsToExport]);

  // Trigger print with current settings
  const handleExecutePrint = () => {
    setIsExportModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 150);
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

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  1. نطاق الأسئلة التي سيتم تصديرها:
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
                      <span>الأسئلة المفلترة حالياً فقط</span>
                      <span className="px-2 py-0.5 rounded bg-sky-200 dark:bg-sky-800 text-[10px]">
                        {filteredQuestions.length} سؤال
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      يصدر فقط الأسئلة المطابقة للفرز الحالي (الصف: {selectedGrade === 'all' ? 'الكل' : GRADE_LABELS[selectedGrade as GradeLevel]} | الصعوبة: {selectedDifficulty === 'all' ? 'الكل' : DIFFICULTY_LABELS[selectedDifficulty as DifficultyLevel]?.label})
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
                      <span>كافة بنك الأسئلة</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">
                        {questions.length} سؤال
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      تصدير البنك بالكامل بجميع المراحل والمهارات في ملف مجمع واحد.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sorting & Grouping Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    2. ترتيب الأسئلة في ملف PDF:
                  </label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as QuestionSortOption)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="difficulty_asc">من الأسهل للأصعب (متوازن للمراجعة)</option>
                    <option value="difficulty_desc">من الأصعب للأسهل</option>
                    <option value="skill">حسب المهارة العقلية</option>
                    <option value="grade">حسب الصف الدراسي</option>
                    <option value="code">حسب رمز السؤال التسلسلي</option>
                    <option value="title">أبجدياً</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    3. طريقة التبويب في التقرير:
                  </label>
                  <select
                    value={exportGrouping}
                    onChange={e => setExportGrouping(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="difficulty">تبويب بأقسام مستوى الصعوبة (سهل، متوسط، صعب)</option>
                    <option value="skill">تبويب بأقسام المهارات العقلية الست</option>
                    <option value="flat">قائمة تسلسلية موحدة ومباشرة</option>
                  </select>
                </div>
              </div>

              {/* Options Checkboxes */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                  4. محتوى الأسئلة في التقرير:
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={exportIncludeAnswers}
                    onChange={e => setExportIncludeAnswers(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span>تضمين الإجابات النموذجية الصحيحة (نموذج مراجعة المشرف المعتمد)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={exportIncludeExplanations}
                    onChange={e => setExportIncludeExplanations(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span>تضمين التفسير العلمي وشرح النمط العقلي لكل سؤال</span>
                </label>
              </div>

              {/* Balance Preview Badge */}
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold block">جاهزية التقرير للتصدير:</span>
                  <span className="text-[11px] opacity-80">
                    إجمالي {questionsToExport.length} سؤالاً (سهل: {exportStats.easy} | متوسط: {exportStats.medium} | صعب: {exportStats.hard})
                  </span>
                </div>
                <Sparkles className="w-5 h-5 text-sky-600" />
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
              <span className="text-emerald-800">سهل: {exportStats.easy}</span>
              <span>|</span>
              <span className="text-sky-800">متوسط: {exportStats.medium}</span>
              <span>|</span>
              <span className="text-amber-800">صعب: {exportStats.hard}</span>
            </div>
          </div>
        </div>

        {/* QUESTIONS LIST ACCORDING TO GROUPING */}
        {exportGrouping === 'difficulty' && (
          <div className="space-y-4">
            {(['easy', 'medium', 'hard', 'advanced'] as DifficultyLevel[]).map(diffKey => {
              const diffQs = questionsToExport.filter(q => q.difficulty === diffKey);
              if (diffQs.length === 0) return null;

              return (
                <div key={diffKey} className="space-y-2.5">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-100 border-r-4 border-slate-900 flex items-center justify-between print-avoid-break">
                    <h2 className="text-xs font-black text-slate-900">
                      مستوى الصعوبة: {DIFFICULTY_LABELS[diffKey].label} ({diffQs.length} سؤال)
                    </h2>
                    <span className="text-[10px] font-bold text-slate-600">
                      مقياس التدرج المعتمد
                    </span>
                  </div>

                  {diffQs.map((q, idx) => (
                    <PrintQuestionCard 
                      key={q.id} 
                      question={q} 
                      index={idx + 1} 
                      includeAnswers={exportIncludeAnswers} 
                      includeExplanations={exportIncludeExplanations} 
                    />
                  ))}
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
                <div key={skillKey} className="space-y-2.5">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-100 border-r-4 border-slate-900 flex items-center justify-between print-avoid-break" style={{ borderColor: def.color }}>
                    <h2 className="text-xs font-black text-slate-900">
                      المجال العقلي: {def.name} ({skillQs.length} سؤال)
                    </h2>
                    <span className="text-[10px] font-bold text-slate-600">
                      {def.description}
                    </span>
                  </div>

                  {skillQs.map((q, idx) => (
                    <PrintQuestionCard 
                      key={q.id} 
                      question={q} 
                      index={idx + 1} 
                      includeAnswers={exportIncludeAnswers} 
                      includeExplanations={exportIncludeExplanations} 
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {exportGrouping === 'flat' && (
          <div className="space-y-2.5">
            {questionsToExport.map((q, idx) => (
              <PrintQuestionCard 
                key={q.id} 
                question={q} 
                index={idx + 1} 
                includeAnswers={exportIncludeAnswers} 
                includeExplanations={exportIncludeExplanations} 
              />
            ))}
          </div>
        )}

        {/* Compact Official Sign-Off Footer at End */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 print-avoid-break">
          <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-bold">
            <div className="space-y-4">
              <div className="text-slate-600">إعداد وتنسيق ومراجعة</div>
              <div className="font-black text-slate-900">منسق الموهوبين أسامة ابراهيم</div>
              <div className="text-[9px] text-slate-400">التوقيع: ............................</div>
            </div>

            <div className="space-y-4">
              <div className="text-slate-600">الإشراف الفني والتربوي</div>
              <div className="font-black text-slate-900">{settings?.supervisorName || 'أ. أسامة ابراهيم'}</div>
              <div className="text-[9px] text-slate-400">التوقيع: ............................</div>
            </div>

            <div className="space-y-4">
              <div className="text-slate-600">الاعتماد الرسمي بالمدرسة</div>
              <div className="font-black text-slate-900">مدير المدرسة / قائد المجمع</div>
              <div className="text-[9px] text-slate-400">الختم الرسمي: [ ................... ]</div>
            </div>
          </div>

          <div className="text-center text-[8px] text-slate-400 mt-4 pt-2 border-t border-slate-200">
            منصة الموهوبين للكشف المبدئي ورعاية الموهوبين - مدارس رياض الإبداع الأهلية | منسق الموهوبين أسامة ابراهيم
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact, High-Density Printable Question Card
 * Designed to fit 3-4 questions per A4 page cleanly without clutter or overflow
 */
interface PrintQuestionCardProps {
  question: Question;
  index: number;
  includeAnswers: boolean;
  includeExplanations: boolean;
}

const PrintQuestionCard: React.FC<PrintQuestionCardProps> = ({
  question,
  index,
  includeAnswers,
  includeExplanations
}) => {
  const skillDef = SKILL_DEFINITIONS[question.skill];
  const diffInfo = DIFFICULTY_LABELS[question.difficulty];

  return (
    <div className="border border-slate-300 rounded-lg p-2.5 print-avoid-break bg-white text-black mb-2.5">
      {/* Header Line */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="bg-slate-900 text-white font-black px-1.5 py-0.5 rounded text-[10px]">
            سؤال {index}
          </span>
          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
            {question.code}
          </span>
          <span className="font-black text-slate-900 text-[11px]">
            {question.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[9px]">
          <span className="font-bold text-slate-700 border border-slate-300 px-1.5 py-0.2 rounded">
            {diffInfo.label}
          </span>
          <span className="font-bold text-slate-700">
            {skillDef?.name}
          </span>
          <span className="font-mono text-slate-500 font-bold">
            ({question.points} درجات)
          </span>
        </div>
      </div>

      {/* Question Text */}
      <p className="text-[11px] font-bold text-slate-900 leading-snug mb-1.5">
        {question.questionText}
      </p>

      {/* Graphic / Illustration - Sized Compactly so questions don't overflow */}
      {(question.svgGraphic || question.imageUrl) && (
        <div className="py-1 px-2 border border-slate-100 rounded flex justify-center bg-slate-50/50 my-1">
          {question.svgGraphic && (
            <VisualShape type={question.svgGraphic} size={110} />
          )}
          {question.imageUrl && !question.svgGraphic && (
            <img 
              src={question.imageUrl} 
              alt="شكل السؤال" 
              referrerPolicy="no-referrer" 
              className="max-h-20 object-contain rounded" 
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
              className={`p-1 px-2 rounded border text-[10px] flex items-center justify-between ${
                isCorrect 
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-black ring-1 ring-emerald-500' 
                  : 'border-slate-300 bg-white text-slate-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                  isCorrect ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {letter}
                </span>
                <span className="leading-tight">{opt.text}</span>
                {opt.svgShape && (
                  <div className="mr-1">
                    <VisualShape type={opt.svgShape} size={28} />
                  </div>
                )}
              </div>

              {isCorrect && (
                <span className="text-[8px] text-emerald-800 font-black mr-1 shrink-0">
                  ✓ صحيح
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact 1-line Explanation */}
      {includeExplanations && question.explanation && (
        <div className="text-[9px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mt-1 font-medium leading-tight">
          💡 <strong>التفسير:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
};
