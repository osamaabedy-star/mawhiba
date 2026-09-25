import React, { useState, useMemo } from 'react';
import { 
  Test, 
  Question, 
  TestModel, 
  GradeLevel, 
  TestLevel, 
  SkillCategory, 
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
  Trash2,
  FileCheck,
  Printer
} from 'lucide-react';
import { VisualShape } from './VisualShape';

interface TestBuilderProps {
  tests: Test[];
  questions: Question[];
  settings?: AppSettings;
  onSaveTest: (test: Test) => void;
  onDeleteTest: (testId: string) => void;
  onLaunchStudentExamWithTest?: (testId: string, modelId: string) => void;
}

export const TestBuilder: React.FC<TestBuilderProps> = ({
  tests,
  questions,
  settings,
  onSaveTest,
  onDeleteTest,
  onLaunchStudentExamWithTest,
}) => {
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [previewTest, setPreviewTest] = useState<{ test: Test; model: TestModel } | null>(null);
  const [validationError, setValidationError] = useState('');
  const [qSearch, setQSearch] = useState('');
  const [qSkill, setQSkill] = useState<string>('all');
  const [qDiff, setQDifficulty] = useState<string>('all');
  const [qGrade, setQGrade] = useState<string>('all');
  const [qSort, setQSort] = useState<'difficulty_asc' | 'difficulty_desc' | 'skill'>('difficulty_asc');

  const filteredQs = useMemo(() => {
    const list = questions.filter(q => {
      const matchesSearch = !qSearch || q.title.toLowerCase().includes(qSearch.toLowerCase()) || q.code.toLowerCase().includes(qSearch.toLowerCase());
      const matchesSkill = qSkill === 'all' || q.skill === qSkill;
      const matchesDiff = qDiff === 'all' || q.difficulty === qDiff;
      const matchesGrade = qGrade === 'all' || q.gradeLevels.includes(qGrade as GradeLevel);
      return matchesSearch && matchesSkill && matchesDiff && matchesGrade;
    });

    return list.sort((a, b) => {
      const diffWeights = { easy: 1, medium: 2, hard: 3, advanced: 4 };
      if (qSort === 'difficulty_asc') {
        return (diffWeights[a.difficulty] || 2) - (diffWeights[b.difficulty] || 2);
      }
      if (qSort === 'difficulty_desc') {
        return (diffWeights[b.difficulty] || 2) - (diffWeights[a.difficulty] || 2);
      }
      return a.skill.localeCompare(b.skill);
    });
  }, [questions, qSearch, qSkill, qDiff, qGrade, qSort]);

  // Start creating new test
  const handleStartCreate = () => {
    const newTest: Test = {
      id: `test_${Date.now()}`,
      title: 'مقياس كشف مبدئي جديد',
      description: 'مقياس إلكتروني لقياس الاستعدادات والقدرات العقلية المتميزة لطلاب المدرسة.',
      targetGrades: ['g4_primary', 'g5_primary'],
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
        {
          id: `mod_${Date.now()}_1`,
          name: 'النموذج الأول (أ)',
          code: 'MOD-A',
          questionIds: questions.slice(0, 5).map(q => q.id),
        },
      ],
    };
    setEditingTest(newTest);
    setIsCreatingNew(true);
    setActiveModelIndex(0);
  };

  // Add a parallel model to editing test
  const handleAddParallelModel = () => {
    if (!editingTest) return;
    const nextNum = editingTest.models.length + 1;
    const arabicOrdinal = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][nextNum - 1] || `${nextNum}`;
    const codeLetter = ['أ', 'ب', 'ج', 'د', 'هـ'][nextNum - 1] || `${nextNum}`;

    // Auto-pick questions that don't repeat the first model's if possible
    const existingIds = new Set(editingTest.models.flatMap(m => m.questionIds));
    const available = questions.filter(q => !existingIds.has(q.id));
    const selectedIds = (available.length >= 4 ? available : questions).slice(0, 5).map(q => q.id);

    const newModel: TestModel = {
      id: `mod_${Date.now()}_${nextNum}`,
      name: `النموذج ${arabicOrdinal} (${codeLetter})`,
      code: `MOD-${codeLetter}`,
      questionIds: selectedIds,
    };

    setEditingTest({
      ...editingTest,
      models: [...editingTest.models, newModel],
    });
    setActiveModelIndex(editingTest.models.length);
  };

  // Auto-generate model questions based on covered skills
  const handleAutoGenerateModelQuestions = (modelIdx: number) => {
    if (!editingTest) return;
    const targetSkills = editingTest.coveredSkills;
    const selected: string[] = [];

    targetSkills.forEach(sk => {
      const match = questions.find(q => q.skill === sk && !selected.includes(q.id));
      if (match) selected.push(match.id);
    });

    // Fill remaining up to 6 questions
    questions.forEach(q => {
      if (selected.length < 6 && !selected.includes(q.id)) {
        selected.push(q.id);
      }
    });

    const updatedModels = [...editingTest.models];
    updatedModels[modelIdx] = {
      ...updatedModels[modelIdx],
      questionIds: selected,
    };

    setEditingTest({
      ...editingTest,
      models: updatedModels,
    });
  };

  // Toggle question in model (preventing duplicate inside same model)
  const toggleQuestionInModel = (questionId: string, modelIdx: number) => {
    if (!editingTest) return;
    const targetModel = editingTest.models[modelIdx];
    const exists = targetModel.questionIds.includes(questionId);

    const newQuestionIds = exists
      ? targetModel.questionIds.filter(id => id !== questionId)
      : [...targetModel.questionIds, questionId];

    const updatedModels = [...editingTest.models];
    updatedModels[modelIdx] = {
      ...targetModel,
      questionIds: newQuestionIds,
    };

    setEditingTest({
      ...editingTest,
      models: updatedModels,
    });
  };

  // Save current test
  const handleSave = () => {
    if (!editingTest) return;
    if (!editingTest.title.trim()) {
      setValidationError('يرجى إدخال اسم الاختبار.');
      return;
    }
    if (editingTest.targetGrades.length === 0) {
      setValidationError('يرجى تحديد صف دراسي واحد على الأقل.');
      return;
    }
    const emptyModel = editingTest.models.find(m => m.questionIds.length === 0);
    if (emptyModel) {
      setValidationError(`النموذج (${emptyModel.name}) لا يحتوي على أي أسئلة! يرجى إضافة أسئلة للنموذج.`);
      return;
    }

    onSaveTest(editingTest);
    setEditingTest(null);
    setIsCreatingNew(false);
    setValidationError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <span>منشئ ومصمم الاختبارات والنماذج</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توليد نماذج اختبارات متكافئة لكل مرحلة ومستوى مع منع التكرار وإعدادات المرونة
          </p>
        </div>

        {!editingTest && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تصميم اختبار جديد</span>
          </button>
        )}
      </div>

      {/* Test Creation & Edit Form */}
      {editingTest ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isCreatingNew ? 'تصميم اختبار ونماذج جديدة' : `تعديل الاختبار: ${editingTest.title}`}
            </h3>
            <button
              onClick={() => { setEditingTest(null); setIsCreatingNew(false); }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              إلغاء التعديل
            </button>
          </div>

          {validationError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Test Meta Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم الاختبار الرسمي *
              </label>
              <input
                type="text"
                value={editingTest.title}
                onChange={e => setEditingTest({ ...editingTest, title: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="مثال: مقياس الكشف المبدئي - الصف السادس الابتدائي"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مستوى الاختبار
              </label>
              <select
                value={editingTest.level}
                onChange={e => setEditingTest({ ...editingTest, level: e.target.value as TestLevel })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {(Object.keys(TEST_LEVEL_LABELS) as TestLevel[]).map(lvl => (
                  <option key={lvl} value={lvl}>{TEST_LEVEL_LABELS[lvl].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Grades & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مدة الاختبار بالدقائق
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={editingTest.durationMinutes}
                onChange={e => setEditingTest({ ...editingTest, durationMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                درجة كل سؤال
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={editingTest.pointsPerQuestion}
                onChange={e => setEditingTest({ ...editingTest, pointsPerQuestion: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                حالة الاختبار
              </label>
              <select
                value={editingTest.status}
                onChange={e => setEditingTest({ ...editingTest, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="published">منشور ومتاح للطلاب</option>
                <option value="draft">مسودة (غير متاح)</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تعليمات الاختبار للطالب قبل البدء
            </label>
            <textarea
              rows={2}
              value={editingTest.instructions}
              onChange={e => setEditingTest({ ...editingTest, instructions: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Test Flags: Back navigation, Shuffle, Instant Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingTest.allowBackNavigation}
                onChange={e => setEditingTest({ ...editingTest, allowBackNavigation: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">السماح بالرجوع للأسئلة السابقة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingTest.shuffleOptions}
                onChange={e => setEditingTest({ ...editingTest, shuffleOptions: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">ترتيب الخيارات عشوائياً</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingTest.showInstantResults}
                onChange={e => setEditingTest({ ...editingTest, showInstantResults: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">إظهار النتيجة فور التسليم للطالب</span>
            </label>
          </div>

          {/* Parallel Models Tab Control */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">النماذج الموازية للاختبار:</span>
                <div className="flex items-center gap-1.5">
                  {editingTest.models.map((mod, idx) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setActiveModelIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeModelIndex === idx
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {mod.name} ({mod.questionIds.length} أسئلة)
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAutoGenerateModelQuestions(activeModelIndex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 hover:bg-teal-100 text-xs font-bold cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>توليد تلقائي للنموذج</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddParallelModel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة نموذج موازٍ</span>
                </button>
              </div>
            </div>

            {/* Questions Selection for Active Model */}
            {editingTest.models[activeModelIndex] && (
              <div className="space-y-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                     <Plus className="w-3.5 h-3.5 text-sky-600" />
                     <span>تخصيص أسئلة {editingTest.models[activeModelIndex].name} ({editingTest.models[activeModelIndex].questionIds.length} سؤال حالياً)</span>
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <input 
                        type="text"
                        value={qSearch}
                        onChange={e => setQSearch(e.target.value)}
                        placeholder="بحث..."
                        className="pr-8 pl-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none w-32 focus:ring-1 focus:ring-sky-500"
                      />
                      <Eye className="w-3 h-3 text-slate-400 absolute right-2.5 top-2" />
                    </div>
                    <select 
                      value={qGrade} 
                      onChange={e => setQGrade(e.target.value)}
                      className="px-2 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="all">كافة الصفوف</option>
                      {Object.entries(GRADE_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                    <select 
                      value={qSkill} 
                      onChange={e => setQSkill(e.target.value)}
                      className="px-2 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="all">كافة المهارات</option>
                      {Object.entries(SKILL_DEFINITIONS).map(([id, def]) => (
                        <option key={id} value={id}>{def.name}</option>
                      ))}
                    </select>
                    <select 
                      value={qDiff} 
                      onChange={e => setQDifficulty(e.target.value)}
                      className="px-2 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="all">كافة الصعوبات</option>
                      <option value="easy">سهل</option>
                      <option value="medium">متوسط</option>
                      <option value="hard">صعب / متقدم</option>
                    </select>
                    <select 
                      value={qSort} 
                      onChange={e => setQSort(e.target.value as any)}
                      className="px-2 py-1.5 text-[10px] rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="difficulty_asc">ترتيب: من الأسهل للأصعب</option>
                      <option value="difficulty_desc">ترتيب: من الأصعب للأسهل</option>
                      <option value="skill">ترتيب: حسب المهارة</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 pr-2 custom-scrollbar">
                  {filteredQs.map(q => {
                    const isSelected = editingTest.models[activeModelIndex].questionIds.includes(q.id);
                    const skillDef = SKILL_DEFINITIONS[q.skill];
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestionInModel(q.id, activeModelIndex)}
                        className={`p-3 rounded-xl border text-right cursor-pointer transition-all flex items-center justify-between gap-3 group ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-950 dark:text-sky-100 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-bold shrink-0">
                              {q.code}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                              q.difficulty === 'medium' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold truncate">{q.title}</p>
                          <span className="text-[9px] opacity-60" style={{ color: skillDef?.color }}>
                            {skillDef?.name}
                          </span>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          isSelected ? 'bg-sky-600 border-sky-600 text-white scale-110' : 'border-slate-200 dark:border-slate-700 group-hover:border-sky-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                  {filteredQs.length === 0 && (
                    <div className="col-span-full py-10 text-center text-slate-400 text-xs italic">
                      لا توجد أسئلة تطابق الفرز الحالي.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setEditingTest(null); setIsCreatingNew(false); }}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ واعتماد الاختبار</span>
            </button>
          </div>
        </div>
      ) : (
        /* Tests Listing Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map(test => {
            const levelInfo = TEST_LEVEL_LABELS[test.level];
            return (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-5 hover:border-sky-300 dark:hover:border-sky-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {levelInfo?.label || 'مستوى عام'}
                    </span>
                    <div className="flex gap-2">
                      {test.targetGrades.map(g => (
                        <span key={g} className="text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                          {GRADE_LABELS[g]}
                        </span>
                      ))}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        test.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {test.status === 'published' ? 'منشور' : 'مسودة'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {test.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {test.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>المدة: {test.durationMinutes} دقيقة</span>
                      <span>•</span>
                      <span>{test.models.length} نماذج موازية</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>الصفوف:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {test.targetGrades.map(g => GRADE_LABELS[g]).join('، ')}
                      </span>
                    </div>
                  </div>

                  {/* Models Pills */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {test.models.map(m => (
                      <span key={m.id} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {m.name}: {m.questionIds.length} سؤال
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewTest({ test, model: test.models[0] })}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="معاينة الاختبار كاملًا"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingTest(test); setIsCreatingNew(false); }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="تعديل الاختبار"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف الاختبار: "${test.title}"؟`)) {
                          onDeleteTest(test.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="حذف الاختبار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {onLaunchStudentExamWithTest && (
                    <button
                      onClick={() => onLaunchStudentExamWithTest(test.id, test.models[0].id)}
                      className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>تشغيل كطالب</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Preview Modal */}
      {previewTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  معاينة المشرف للاختبار: {previewTest.test.title}
                </h3>
                <span className="text-xs text-sky-600 font-bold">{previewTest.model.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="طباعة أو تصدير هذا النموذج إلى PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>طباعة النموذج (PDF)</span>
                </button>
                <button
                  onClick={() => setPreviewTest(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 text-xs text-sky-900 dark:text-sky-200 space-y-1">
              <span className="font-bold">تعليمات الاختبار المعروضة للطالب:</span>
              <p>{previewTest.test.instructions}</p>
            </div>

            <div className="space-y-4">
              {previewTest.model.questionIds.map((qid, idx) => {
                const q = questions.find(item => item.id === qid);
                if (!q) return null;
                return (
                  <div key={qid} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                        السؤال {idx + 1} من {previewTest.model.questionIds.length} ({q.code})
                      </span>
                      <span className="text-[11px] text-slate-500">{q.points} درجات</span>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      {q.questionText}
                    </p>

                    {(q.imageUrl || q.svgGraphic) && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 flex justify-center">
                        {q.svgGraphic && <VisualShape type={q.svgGraphic} size={160} />}
                        {q.imageUrl && <img src={q.imageUrl} alt="شكل السؤال" referrerPolicy="no-referrer" className="max-h-36 object-contain rounded" />}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const letter = ['أ', 'ب', 'ج', 'د'][optIdx] || `${optIdx + 1}`;
                        const isCorrect = q.correctOptionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">
                              {letter}
                            </span>
                            <span>{opt.text}</span>
                            {isCorrect && <span className="mr-auto text-[10px] text-emerald-700 font-bold">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
