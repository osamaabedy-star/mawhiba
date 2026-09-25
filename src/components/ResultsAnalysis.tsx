import React, { useState, useMemo } from 'react';
import { 
  ExamSubmission, 
  Student, 
  Test, 
  Question, 
  AppSettings, 
  SkillCategory, 
  CandidateStatus, 
  SKILL_DEFINITIONS, 
  CANDIDATE_STATUS_INFO 
} from '../types';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Eye, 
  Award, 
  AlertCircle, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  FileText, 
  Printer, 
  X,
  Sparkles,
  ChevronLeft,
  Brain,
  HelpCircle,
  Shuffle,
  ShieldCheck,
  Check,
  RotateCcw
} from 'lucide-react';

interface ResultsAnalysisProps {
  submissions: ExamSubmission[];
  students: Student[];
  tests: Test[];
  questions: Question[];
  settings: AppSettings;
  onOpenReportForSubmission: (submissionId: string) => void;
  onUpdateCandidateStatus: (submissionId: string, status: CandidateStatus, notes?: string) => void;
  onResetStudentTest?: (studentId: string) => void;
}

export const ResultsAnalysis: React.FC<ResultsAnalysisProps> = ({
  submissions,
  students,
  tests,
  questions,
  settings,
  onOpenReportForSubmission,
  onUpdateCandidateStatus,
  onResetStudentTest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [testFilter, setTestFilter] = useState<string>('all');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [subToReset, setSubToReset] = useState<ExamSubmission | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const student = students.find(s => s.id === sub.studentId);
      const test = tests.find(t => t.id === sub.testId);

      const matchesSearch = 
        (student && student.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student && student.nationalId && student.nationalId.includes(searchTerm)) ||
        (student && student.nationalIdMasked && student.nationalIdMasked.includes(searchTerm)) ||
        (student && student.classroom.includes(searchTerm));

      const matchesStatus = statusFilter === 'all' || sub.candidateStatus === statusFilter;
      const matchesTest = testFilter === 'all' || sub.testId === testFilter;

      return matchesSearch && matchesStatus && matchesTest;
    });
  }, [submissions, students, tests, searchTerm, statusFilter, testFilter]);

  const activeSubmission = submissions.find(s => s.id === selectedSubmissionId);
  const activeStudent = activeSubmission ? students.find(s => s.id === activeSubmission.studentId) : null;
  const activeTest = activeSubmission ? tests.find(t => t.id === activeSubmission.testId) : null;

  // Aggregate Stats
  const avgPercentage = submissions.length > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / submissions.length)
    : 0;

  const nominatedCount = submissions.filter(s => s.candidateStatus === 'nominated_preliminary' || s.candidateStatus === 'reviewed_by_supervisor').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <span>لوحة تحليل النتائج والمؤشرات المهارية</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تحليل تفصيلي لأداء الطلاب في المهارات الست والفرز المبدئي للترشيح ({submissions.length} نتيجة مصححة)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left">
            <span className="text-[11px] text-slate-500 block">متوسط المدرسة العام</span>
            <span className="text-lg font-black text-sky-600">{avgPercentage}%</span>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
          <div className="text-left">
            <span className="text-[11px] text-slate-500 block">مرشحون مبدئياً</span>
            <span className="text-lg font-black text-emerald-600">{nominatedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الطالب، السجل المدني..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">كافة حالات الترشيح</option>
              {(Object.keys(CANDIDATE_STATUS_INFO) as CandidateStatus[]).map(st => (
                <option key={st} value={st}>{CANDIDATE_STATUS_INFO[st].label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={testFilter}
              onChange={e => setTestFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">كافة الاختبارات المنفذة</option>
              {tests.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">اسم الطالب</th>
                <th className="px-4 py-3.5">الصف والفصل</th>
                <th className="px-4 py-3.5">الاختبار والنموذج</th>
                <th className="px-4 py-3.5">الدرجة المحققة</th>
                <th className="px-4 py-3.5">النسبة المئوية</th>
                <th className="px-4 py-3.5">المؤشر الأولي</th>
                <th className="px-4 py-3.5 text-center">فحص التكرار (تفكير أم عشوائية)</th>
                <th className="px-5 py-3.5 text-center">التحليل والإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSubmissions.map(sub => {
                const stu = students.find(s => s.id === sub.studentId);
                const test = tests.find(t => t.id === sub.testId);
                const model = test?.models.find(m => m.id === sub.modelId);
                const statusInfo = CANDIDATE_STATUS_INFO[sub.candidateStatus];
                const cons = sub.consistencyAnalysis;

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                      <div>{stu?.fullName || 'طالب مجهول'}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{stu?.nationalId}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {stu?.classroom}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{test?.title}</div>
                      <span className="text-[10px] text-sky-600 font-bold">{model?.name}</span>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {sub.totalScore} / {sub.maxScore}
                    </td>
                    <td className="px-4 py-4 font-bold">
                      <span className={`text-sm ${
                        sub.percentage >= settings.minScoreForNomination
                          ? 'text-emerald-600 font-black'
                          : sub.percentage >= 60
                          ? 'text-sky-600'
                          : 'text-slate-600'
                      }`}>
                        {sub.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] px-2.5 py-1 rounded-md border font-bold ${statusInfo?.badgeClass}`}>
                        {statusInfo?.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {cons ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                          style={{
                            backgroundColor: cons.behaviorPattern === 'deliberate_thought' 
                              ? '#ecfdf5' 
                              : cons.behaviorPattern === 'mostly_thoughtful'
                              ? '#f0f9ff'
                              : cons.behaviorPattern === 'suspicious_random'
                              ? '#fffbeb'
                              : '#fff1f2',
                            color: cons.behaviorPattern === 'deliberate_thought'
                              ? '#065f46'
                              : cons.behaviorPattern === 'mostly_thoughtful'
                              ? '#0369a1'
                              : cons.behaviorPattern === 'suspicious_random'
                              ? '#92400e'
                              : '#9f1239',
                            borderColor: cons.behaviorPattern === 'deliberate_thought'
                              ? '#a7f3d0'
                              : cons.behaviorPattern === 'mostly_thoughtful'
                              ? '#bae6fd'
                              : cons.behaviorPattern === 'suspicious_random'
                              ? '#fde68a'
                              : '#fecdd3',
                          }}
                          title={`تطابق ${cons.consistentPairsCount} من ${cons.repeatedPairsCount} أسئلة مكررة`}
                        >
                          {cons.behaviorPattern === 'deliberate_thought' && <Brain className="w-3.5 h-3.5" />}
                          {cons.behaviorPattern === 'mostly_thoughtful' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {(cons.behaviorPattern === 'suspicious_random' || cons.behaviorPattern === 'high_random') && <Shuffle className="w-3.5 h-3.5" />}
                          <span>
                            {cons.behaviorPattern === 'deliberate_thought' ? 'تفكير متأمل (ثابت)' :
                             cons.behaviorPattern === 'mostly_thoughtful' ? 'تفكير واعٍ' :
                             cons.behaviorPattern === 'suspicious_random' ? 'احتمال تخمين' : 'عشوائية مرجحة'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">غير مفعل</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedSubmissionId(sub.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 text-xs font-bold cursor-pointer transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تحليل الأداء</span>
                        </button>

                        <button
                          onClick={() => onOpenReportForSubmission(sub.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold cursor-pointer transition-all"
                          title="عرض التقرير الرسمي المعتمد"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>التقرير</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Analysis Drawer / Modal for Selected Submission */}
      {activeSubmission && activeStudent && activeTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-md">
                  بطاقة التحليل النفسي والمهاري للكشف المبدئي
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {activeStudent.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeStudent.classroom} • السجل المدني: {activeStudent.nationalId} • {activeTest.title}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmissionId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block">النسبة الإجمالية</span>
                <span className="text-xl font-black text-sky-600">{activeSubmission.percentage}%</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block">الدرجة المحققة</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {activeSubmission.totalScore} / {activeSubmission.maxScore}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block">الوقت المستغرق</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {Math.round(activeSubmission.timeSpentSeconds / 60)} دقيقة
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 block">الإجابات الصحيحة</span>
                <span className="text-xl font-black text-emerald-600">
                  {activeSubmission.correctAnswersCount} من {activeSubmission.totalQuestions}
                </span>
              </div>
            </div>

            {/* Skill Radar / Progress Bars */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                تفصيل الأداء بحسب المهارات العقلية المقاسة:
              </h4>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                {(Object.keys(activeSubmission.skillResults) as SkillCategory[]).map(sk => {
                  const res = activeSubmission.skillResults[sk];
                  const skillDef = SKILL_DEFINITIONS[sk];
                  if (!res || res.questionsCount === 0) return null;

                  return (
                    <div key={sk} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{skillDef?.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            res.status === 'high' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : res.status === 'needs_development'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {res.status === 'high' ? 'أداء مرتفع' : res.status === 'needs_development' ? 'يحتاج تطوير' : 'متوسط'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{res.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${res.percentage}%`,
                            backgroundColor: skillDef?.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Development Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>نقاط القوة والاستعداد الذهني البارزة:</span>
                </span>
                <p className="text-xs text-emerald-950 dark:text-emerald-200">
                  {activeSubmission.strengths.length > 0 
                    ? activeSubmission.strengths.join('، ')
                    : 'أداء متوازن عبر المهارات المقاسة'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>مجالات وفرص التحسين والتطوير:</span>
                </span>
                <p className="text-xs text-amber-950 dark:text-amber-200">
                  {activeSubmission.areasToDevelop.length > 0 
                    ? activeSubmission.areasToDevelop.join('، ')
                    : 'لا توجد مجالات ضعف حرجة مرصودة في هذا المقياس'}
                </p>
              </div>
            </div>

            {/* Repeated Questions & Thoughtfulness Inspection (كشف التخمين العشوائي والتفكير المتأمل) */}
            {activeSubmission.consistencyAnalysis && (
              <div className="p-4 rounded-2xl border bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        فحص الثبات الإدراكي (التفكير المتأمل مقابل التخمين العشوائي)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        مقارنة إجابات الطالب عند تكرار نفس الأسئلة في مواضع متباعدة أثناء الاختبار
                      </p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block font-semibold">نسبة التطابق الإدراكي</span>
                    <span className="text-base font-black text-sky-700 dark:text-sky-300">
                      {activeSubmission.consistencyAnalysis.consistencyRate}%
                    </span>
                  </div>
                </div>

                {/* Behavioral Verdict Badge */}
                <div className="p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5"
                  style={{
                    backgroundColor: activeSubmission.consistencyAnalysis.behaviorPattern === 'deliberate_thought' 
                      ? '#ecfdf5' 
                      : activeSubmission.consistencyAnalysis.behaviorPattern === 'mostly_thoughtful'
                      ? '#f0f9ff'
                      : activeSubmission.consistencyAnalysis.behaviorPattern === 'suspicious_random'
                      ? '#fffbeb'
                      : '#fff1f2',
                    color: activeSubmission.consistencyAnalysis.behaviorPattern === 'deliberate_thought'
                      ? '#065f46'
                      : activeSubmission.consistencyAnalysis.behaviorPattern === 'mostly_thoughtful'
                      ? '#0369a1'
                      : activeSubmission.consistencyAnalysis.behaviorPattern === 'suspicious_random'
                      ? '#92400e'
                      : '#9f1239',
                    borderColor: activeSubmission.consistencyAnalysis.behaviorPattern === 'deliberate_thought'
                      ? '#a7f3d0'
                      : activeSubmission.consistencyAnalysis.behaviorPattern === 'mostly_thoughtful'
                      ? '#bae6fd'
                      : activeSubmission.consistencyAnalysis.behaviorPattern === 'suspicious_random'
                      ? '#fde68a'
                      : '#fecdd3',
                  }}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-0.5">
                      {activeSubmission.consistencyAnalysis.behaviorPattern === 'deliberate_thought' ? 'المؤشر: تفكير متأنٍ ومترابط (دقة عالية)' :
                       activeSubmission.consistencyAnalysis.behaviorPattern === 'mostly_thoughtful' ? 'المؤشر: تفكير واعٍ مع تردد طفيف' :
                       activeSubmission.consistencyAnalysis.behaviorPattern === 'suspicious_random' ? 'المؤشر: احتمال تخمين سريع أو عدم تركيز' : 'المؤشر: مؤشرات قوية على عشوائية الإجابات'}
                    </span>
                    <p className="text-[11px] opacity-90">
                      {activeSubmission.consistencyAnalysis.behaviorDescription}
                    </p>
                  </div>
                </div>

                {/* Detailed Comparison Table of Repeated Questions */}
                {activeSubmission.consistencyAnalysis.details.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-right text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-750 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">السؤال المكرر</th>
                          <th className="p-2">الظهور الأول</th>
                          <th className="p-2">الظهور الثاني</th>
                          <th className="p-2 text-center">حالة الاتساق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {activeSubmission.consistencyAnalysis.details.map((d, dIdx) => (
                          <tr key={dIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50">
                            <td className="p-2 font-medium text-slate-900 dark:text-white max-w-[220px] truncate" title={d.questionTitle}>
                              {d.questionTitle}
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-300 font-medium">
                              {d.firstAnswerText}
                            </td>
                            <td className="p-2 text-slate-600 dark:text-slate-300 font-medium">
                              {d.secondAnswerText}
                            </td>
                            <td className="p-2 text-center">
                              {d.isMatch ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  <span>متطابق (تفكير واثق)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <X className="w-3 h-3" />
                                  <span>مختلف (تخمين/تردد)</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Supervisor Status Update Control */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  قرار المشرف بخصوص حالة الطالب:
                </span>
                <select
                  value={activeSubmission.candidateStatus}
                  onChange={e => onUpdateCandidateStatus(activeSubmission.id, e.target.value as CandidateStatus)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {(Object.keys(CANDIDATE_STATUS_INFO) as CandidateStatus[]).map(st => (
                    <option key={st} value={st}>{CANDIDATE_STATUS_INFO[st].label}</option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-slate-500">
                ملاحظات المشرف المسجلة: {activeSubmission.supervisorNotes || 'لا توجد ملاحظات إضافية.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubmissionId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إغلاق
              </button>

              <button
                onClick={() => {
                  setSelectedSubmissionId(null);
                  onOpenReportForSubmission(activeSubmission.id);
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>فتح التقرير الرسمي القابل للطباعة</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Retake / Delete Submission Modal */}
      {subToReset && (() => {
        const targetStudent = students.find(s => s.id === subToReset.studentId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  حذف النتيجة وفتح إعادة الاختبار
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف هذه النتيجة للطالب <strong className="text-slate-900 dark:text-white font-bold">{targetStudent?.fullName || 'الطالب'}</strong>؟
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed text-right space-y-1">
                <p className="font-bold">⚠️ تنبيه هام:</p>
                <p>• سيتم حذف سجل هذه المحاولة ودرجتها ({subToReset.totalScore} من {subToReset.maxScore} - {subToReset.percentage}%).</p>
                <p>• ستتم إعادة تعيين حالة الطالب إلى "لم يبدأ" ليتسنى له إجراء اختبار جديد فوراً.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubToReset(null)}
                  className="w-1/2 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onResetStudentTest) {
                      onResetStudentTest(subToReset.studentId);
                    }
                    setFeedbackToast('تم حذف النتيجة بنجاح وفتح الاختبار مجدداً للطالب.');
                    setSubToReset(null);
                    setTimeout(() => setFeedbackToast(null), 5000);
                  }}
                  className="w-1/2 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 cursor-pointer transition-colors"
                >
                  تأكيد الحذف وإعادة الاختبار
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};
