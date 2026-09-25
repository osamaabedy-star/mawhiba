import React, { useState } from 'react';
import { 
  Question, 
  QuestionType, 
  SkillCategory, 
  DifficultyLevel, 
  GradeLevel, 
  GRADE_LABELS, 
  SKILL_DEFINITIONS,
  DIFFICULTY_LABELS
} from '../types';
import { 
  X, 
  Save, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { VisualShape } from './VisualShape';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: Question | null;
  onSaveQuestion: (question: Question) => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  onSaveQuestion,
}) => {
  const isEditing = Boolean(questionToEdit);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [skill, setSkill] = useState<SkillCategory>('mental_flexibility');
  const [subSkill, setSubSkill] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [type, setType] = useState<QuestionType>('multiple_choice_4');
  const [points, setPoints] = useState<number>(5);
  const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState<number>(50);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [svgGraphic, setSvgGraphic] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');
  const [isExperimental, setIsExperimental] = useState<boolean>(false);
  const [selectedGrades, setSelectedGrades] = useState<GradeLevel[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [correctOptionId, setCorrectOptionId] = useState<string>('opt_1');

  // Sync state when questionToEdit changes
  React.useEffect(() => {
    if (isOpen) {
      setCode(questionToEdit?.code || `Q-${Math.floor(100 + Math.random() * 900)}`);
      setTitle(questionToEdit?.title || '');
      setQuestionText(questionToEdit?.questionText || '');
      setSkill(questionToEdit?.skill || 'mental_flexibility');
      setSubSkill(questionToEdit?.subSkill || '');
      setDifficulty(questionToEdit?.difficulty || 'medium');
      setType(questionToEdit?.type || 'multiple_choice_4');
      setPoints(questionToEdit?.points || 5);
      setEstimatedTimeSeconds(questionToEdit?.estimatedTimeSeconds || 50);
      setImageUrl(questionToEdit?.imageUrl || '');
      setSvgGraphic(questionToEdit?.svgGraphic || '');
      setExplanation(questionToEdit?.explanation || '');
      setSupervisorNotes(questionToEdit?.supervisorNotes || '');
      setIsExperimental(questionToEdit?.isExperimental || false);
      setSelectedGrades(questionToEdit?.gradeLevels || ['g3_primary', 'g4_primary', 'g5_primary', 'g6_primary', 'g1_middle', 'g2_middle', 'g3_middle']);
      setOptions(questionToEdit?.options || [
        { id: 'opt_1', text: '' },
        { id: 'opt_2', text: '' },
        { id: 'opt_3', text: '' },
        { id: 'opt_4', text: '' },
      ]);
      setCorrectOptionId(questionToEdit?.correctOptionId || 'opt_1');
      setErrorMsg('');
      
      // Log for debugging
      if (questionToEdit) {
        console.log('Editing question:', questionToEdit.id, 'Difficulty:', questionToEdit.difficulty);
      }
    }
  }, [questionToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle Image Upload from disk
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
        setSvgGraphic(''); // clear predefined SVG if custom image uploaded
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Grade Selection
  const toggleGrade = (grade: GradeLevel) => {
    if (selectedGrades.includes(grade)) {
      if (selectedGrades.length > 1) {
        setSelectedGrades(selectedGrades.filter(g => g !== grade));
      }
    } else {
      setSelectedGrades([...selectedGrades, grade]);
    }
  };

  // Update Option Text
  const updateOptionText = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  // Save handler
  const handleSave = () => {
    let finalTitle = title.trim();
    
    // Auto-generate title if missing but question text exists
    if (!finalTitle && questionText.trim()) {
      finalTitle = questionText.trim().substring(0, 40) + (questionText.trim().length > 40 ? '...' : '');
    }

    if (!finalTitle) {
      setErrorMsg('يرجى إدخال عنوان أو نص للسؤال.');
      return;
    }
    if (!questionText.trim()) {
      setErrorMsg('يرجى إدخال نص السؤال.');
      return;
    }
    if (selectedGrades.length === 0) {
      setErrorMsg('يرجى تحديد صف دراسي واحد على الأقل.');
      return;
    }
    const emptyOptions = options.some(o => !o.text?.trim() && !o.imageUrl && !o.svgShape);
    if (emptyOptions && type !== 'numeric_input') {
      setErrorMsg('يرجى ملء جميع الخيارات المعروضة.');
      return;
    }

    const newQuestion: Question = {
      id: questionToEdit ? questionToEdit.id : `q_${Date.now()}`,
      code,
      title: finalTitle,
      questionText: questionText.trim(),
      imageUrl: imageUrl.trim() || undefined,
      svgGraphic: svgGraphic || undefined,
      type,
      options,
      correctOptionId,
      explanation: explanation.trim(),
      skill,
      subSkill: subSkill.trim() || undefined,
      gradeLevels: selectedGrades,
      difficulty,
      points: Number(points) || 5,
      estimatedTimeSeconds: Number(estimatedTimeSeconds) || 50,
      isExperimental,
      status: 'active',
      supervisorNotes: supervisorNotes.trim() || undefined,
      usageCount: questionToEdit ? questionToEdit.usageCount : 0,
      correctAnswersCount: questionToEdit ? questionToEdit.correctAnswersCount : 0,
    };

    onSaveQuestion(newQuestion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {isEditing ? 'تعديل السؤال في بنك الأسئلة' : 'إضافة سؤال جديد إلى بنك الأسئلة المركزي'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تحديد المهارة، الصف، الصعوبة والخيارات التوضيحية
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Basic Metadata (Code, Title, Skill, Difficulty) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رمز السؤال (الكود)
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان السؤال المختصر *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: اكتشاف النمط في المتتاليات العددية"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Skill & Subskill & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المهارة العقلية الرئيسة *
              </label>
              <select
                value={skill}
                onChange={e => setSkill(e.target.value as SkillCategory)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              >
                {(Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).map(sk => (
                  <option key={sk} value={sk}>
                    {SKILL_DEFINITIONS[sk].name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المهارة الفرعية (اختياري)
              </label>
              <input
                type="text"
                value={subSkill}
                onChange={e => setSubSkill(e.target.value)}
                placeholder="مثال: التناظر اللفظي / الدوران الذهني"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مستوى الصعوبة
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              >
                {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map(lvl => (
                  <option key={lvl} value={lvl}>
                    {DIFFICULTY_LABELS[lvl].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نص السؤال بالكامل *
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="اكتب نص السؤال بوضوح وصياغة لغوية سليمة..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Image & Visual Graphic Section */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">إضافة صورة توضيحية</span>
                  <span className="text-[10px] text-slate-500 font-bold">يمكنك رفع صورة، وضع رابط، أو اختيار نمط جاهز</span>
                </div>
              </div>
              {(imageUrl || svgGraphic) && (
                <button
                  type="button"
                  onClick={() => { setImageUrl(''); setSvgGraphic(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black transition-colors border border-rose-200 shadow-sm cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>حذف الصورة الحالية</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* 1. Device Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 mb-1">الخيار 1: رفع من جهازك</label>
                <label className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-500 hover:bg-sky-50/50 rounded-2xl cursor-pointer bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all">
                  <Upload className="w-6 h-6 text-sky-600" />
                  <span>اختر ملف الصورة</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {/* 2. URL and library selection */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-1">الخيار 2: وضع رابط مباشر (URL)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={e => { setImageUrl(e.target.value); if(e.target.value) setSvgGraphic(''); }}
                      placeholder="https://example.com/image.png"
                      className="w-full pr-3 pl-10 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                    <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-1">الخيار 3: اختيار نمط بصري جاهز</label>
                  <select
                    value={svgGraphic}
                    onChange={e => { setSvgGraphic(e.target.value); setImageUrl(''); }}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer font-bold"
                  >
                    <option value="">-- بدون نمط توضيحي --</option>
                    <option value="scissors_lever">رافعة المقص ومحور الارتكاز (نقاط 1، 2، 3، 4)</option>
                    <option value="gears_mechanical">منظومة تروس ميكانيكية (3 تروس أ، ب، ج)</option>
                    <option value="gears_four_train">سلسلة تروس رباعية (1، 2، 3، 4)</option>
                    <option value="mental_rotation_90">الدوران الذهني بزاوية 90 درجة مع عقارب الساعة</option>
                    <option value="matrix_3x3_pattern">مصفوفة أشكال 3×3 مع خانة ناقصة (؟)</option>
                    <option value="balance_scale">ميزان ذو كفتين لمقارنة الكتل</option>
                    <option value="spatial_cube_fold">مخطط طي مكعب ثلاثي الأبعاد</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Preview Area */}
            {(imageUrl || svgGraphic) && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معاينة الصورة الحالية</span>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg flex justify-center items-center max-w-full">
                  {imageUrl && (
                    <img src={imageUrl} alt="معاينة السؤال" referrerPolicy="no-referrer" className="max-h-52 rounded-lg object-contain shadow-xs" />
                  )}
                  {svgGraphic && (
                    <VisualShape type={svgGraphic} size={220} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Target Grades Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              الصفوف والمراحل الدراسية المناسبة *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(grade => {
                const checked = selectedGrades.includes(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => toggleGrade(grade)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-right transition-all cursor-pointer ${
                      checked
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-800 dark:text-sky-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                      checked ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checked && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{GRADE_LABELS[grade]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                خيارات الإجابة وتحديد الإجابة الصحيحة *
              </label>
              <span className="text-[11px] text-slate-500">اختر الدائرة بجانب الخيار لتحديده كإجابة صحيحة</span>
            </div>

            <div className="space-y-2.5">
              {options.map((opt, idx) => {
                const isCorrect = correctOptionId === opt.id;
                const letter = ['أ', 'ب', 'ج', 'د'][idx] || `${idx + 1}`;
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isCorrect 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectOptionId(opt.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 cursor-pointer ${
                        isCorrect
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 text-slate-400 hover:border-slate-400'
                      }`}
                      title={isCorrect ? 'الإجابة الصحيحة' : 'اضغط لجعلها الإجابة الصحيحة'}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      value={opt.text || ''}
                      onChange={e => updateOptionText(opt.id, e.target.value)}
                      placeholder={`نص الخيار (${letter})`}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    {isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 shrink-0">
                        صحيحة ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation & Supervisor Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تفسير الإجابة الصحيحة والمبرر العقلي
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="تفسير منطقي لكيفية الوصول للحل ليفيد المشرف أثناء المراجعة..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات المشرف الخاصة (سرية للمشرف)
              </label>
              <textarea
                rows={2}
                value={supervisorNotes}
                onChange={e => setSupervisorNotes(e.target.value)}
                placeholder="ملاحظات توجيهية حول طريقة تطبيق السؤال..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Points, Time & Experimental Flag */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الدرجة المخصصة للسؤال
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={points}
                onChange={e => setPoints(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الزمن التقديري (بالثواني)
              </label>
              <input
                type="number"
                min={10}
                max={300}
                value={estimatedTimeSeconds}
                onChange={e => setEstimatedTimeSeconds(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isExperimental"
                checked={isExperimental}
                onChange={e => setIsExperimental(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="isExperimental" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                سؤال تجريبي (لا يدخل في حساب النتيجة المبدئية)
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء الأمر
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'حفظ التعديلات' : 'إضافة السؤال للبنك'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
