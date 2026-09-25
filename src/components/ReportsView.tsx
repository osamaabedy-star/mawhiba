import React, { useState, useMemo } from 'react';
import { 
  ExamSubmission, 
  Student, 
  Test, 
  AppSettings, 
  SkillCategory, 
  GradeLevel,
  GRADE_LABELS, 
  SKILL_DEFINITIONS,
  CANDIDATE_STATUS_INFO 
} from '../types';
import { 
  Printer, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  FileText,
  Search,
  School,
  Share2,
  Brain
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

interface ReportsViewProps {
  submissions: ExamSubmission[];
  students: Student[];
  tests: Test[];
  settings: AppSettings;
  selectedSubmissionId?: string | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  submissions,
  students,
  tests,
  settings,
  selectedSubmissionId,
}) => {
  const [reportType, setReportType] = useState<'individual' | 'school_summary'>('individual');
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(
    selectedSubmissionId || submissions[0]?.id || ''
  );
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // دالة لتحديد مستوى موهبة بناءً على الصف
  const getMawhibaLevel = (grade?: string): '1' | '2' | '3' => {
    if (!grade) return '1';
    if (['g3_primary', 'g4_primary', 'g5_primary'].includes(grade)) return '1';
    if (['g6_primary', 'g7_intermediate', 'g8_intermediate'].includes(grade)) return '2';
    return '3';
  };

  const filteredSubmissions = useMemo(() => {
    if (levelFilter === 'all') return submissions;
    return submissions.filter(sub => {
      const st = students.find(s => s.id === sub.studentId);
      return getMawhibaLevel(st?.grade || st?.gradeLevel) === levelFilter;
    });
  }, [submissions, students, levelFilter]);

  const activeSubmission = filteredSubmissions.find(s => s.id === activeSubmissionId) || filteredSubmissions[0];
  const activeStudent = activeSubmission ? students.find(s => s.id === activeSubmission.studentId) : null;
  const activeTest = activeSubmission ? tests.find(t => t.id === activeSubmission.testId) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar (Hidden during print) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setReportType('individual')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                reportType === 'individual'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              تقرير أداء طالب فردي
            </button>
            <button
              onClick={() => setReportType('school_summary')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                reportType === 'school_summary'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              التقرير الإحصائي الشامل للمدرسة
            </button>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500">تصفية المستوى:</span>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as any)}
              className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">كافة المستويات</option>
              <option value="1">موهبة - المستوى 1</option>
              <option value="2">موهبة - المستوى 2</option>
              <option value="3">موهبة - المستوى 3</option>
            </select>
          </div>

          {/* Student Selector when in individual mode */}
          {reportType === 'individual' && filteredSubmissions.length > 0 && (
            <select
              value={activeSubmissionId}
              onChange={e => setActiveSubmissionId(e.target.value)}
              className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
            >
              {filteredSubmissions.map(sub => {
                const s = students.find(item => item.id === sub.studentId);
                return (
                  <option key={sub.id} value={sub.id}>
                    {s?.fullName || 'طالب'} ({sub.percentage}%) - {s?.classroom}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الرسمي (PDF)</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT WRAPPER - A4 CERTIFIED PRINTABLE STYLING */}
      {reportType === 'individual' && activeSubmission && activeStudent && activeTest ? (
        <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-lg max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-2 print:m-0 print:max-w-none">
          {/* Official Formal Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
            <div className="text-right space-y-1 text-xs font-bold leading-relaxed text-slate-800">
              <div>المملكة العربية السعودية</div>
              <div>وزارة التعليم</div>
              <div>الإدارة العامة للتعليم بمنطقة الرياض</div>
              <div className="font-extrabold text-sky-800">{settings.schoolName}</div>
              <div>قسم رعاية الموهوبين والمبدعين</div>
            </div>

            <div className="text-center space-y-1">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                <SchoolLogo size={48} />
              </div>
            </div>

            <div className="text-left space-y-1 text-xs text-slate-700 font-medium">
              <div>التاريخ: {new Date().toLocaleDateString('ar-SA')}</div>
              <div>العام الدراسي: 1447-1448هـ</div>
              <div>المشرف: {settings.supervisorName}</div>
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center py-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              تقرير الكشف المبدئي عن الاستعدادات والقدرات العقلية
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              نتائج مقياس: {activeTest.title} (النموذج المقنن)
            </p>
          </div>

          {/* Student Identity Information Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block font-semibold text-[11px]">اسم الطالب الرباعي:</span>
              <span className="font-bold text-slate-900 text-sm">{activeStudent.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[11px]">السجل المدني / الهوية:</span>
              <span className="font-mono font-bold text-slate-800">{activeStudent.nationalId}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[11px]">المرحلة والصف:</span>
              <span className="font-bold text-slate-800">
                {GRADE_LABELS[(activeStudent.grade || activeStudent.gradeLevel || 'g6_primary') as GradeLevel]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[11px]">الفصل الدراسي:</span>
              <span className="font-bold text-slate-800">{activeStudent.classroom}</span>
            </div>
          </div>

          {/* Score & Candidate Status Ribbon */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-teal-50 to-emerald-50 border border-sky-200 text-center">
            <div>
              <span className="text-[11px] text-slate-600 block font-bold">الدرجة المحققة</span>
              <span className="text-xl font-black text-slate-900">
                {activeSubmission.totalScore} / {activeSubmission.maxScore}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block font-bold">النسبة المئوية الإجمالية</span>
              <span className="text-2xl font-black text-sky-700">
                {activeSubmission.percentage}%
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block font-bold">المؤشر الأولي والترشيح</span>
              <span className="text-xs font-black px-2.5 py-1 rounded-md bg-white border border-slate-300 inline-block mt-1">
                {CANDIDATE_STATUS_INFO[activeSubmission.candidateStatus]?.label}
              </span>
            </div>
          </div>

          {/* Cognitive Skills Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>أولاً: التحليل التفصيلي للمهارات العقلية المقاسة:</span>
            </h3>

            <table className="w-full text-right text-xs border border-slate-300 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2.5">المجال / المهارة العقلية</th>
                  <th className="p-2.5 text-center">الأسئلة</th>
                  <th className="p-2.5 text-center">الإجابات الصحيحة</th>
                  <th className="p-2.5 text-center">النسبة المحققة</th>
                  <th className="p-2.5 text-center">المستوى الدال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(Object.keys(activeSubmission.skillResults) as SkillCategory[]).map(sk => {
                  const res = activeSubmission.skillResults[sk];
                  const skillDef = SKILL_DEFINITIONS[sk];
                  if (!res || res.questionsCount === 0) return null;

                  return (
                    <tr key={sk} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{skillDef?.name}</td>
                      <td className="p-2.5 text-center font-mono">{res.questionsCount}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{res.correctCount}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{res.percentage}%</td>
                      <td className="p-2.5 text-center font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          res.status === 'high'
                            ? 'bg-emerald-100 text-emerald-800 font-bold'
                            : res.status === 'needs_development'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {res.status === 'high' ? 'مرتفع جداً' : res.status === 'needs_development' ? 'يحتاج دعم' : 'متوسط'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Qualitative Notes & Strengths */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <span className="font-extrabold text-slate-900 block">نقاط القوة والاستعداد البارز:</span>
              <p className="text-slate-700 leading-relaxed">
                {activeSubmission.strengths.length > 0 
                  ? activeSubmission.strengths.join('، ')
                  : 'أظهر الطالب أداءً متزناً في كافة محاور المقياس.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <span className="font-extrabold text-slate-900 block">ملاحظات وتوصية المشرف:</span>
              <p className="text-slate-700 leading-relaxed italic">
                "{activeSubmission.supervisorNotes || 'يوصى باستكمال برامج الإثراء والتحقق النوعي الصفّي.'}"
              </p>
            </div>
          </div>

          {/* Cognitive Consistency & Thoughtfulness Verification (فحص التكرار والثبات الإدراكي) */}
          {activeSubmission.consistencyAnalysis && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-sky-700" />
                  <span>ثانياً: مؤشر الثبات الإدراكي ونمط التفكير (فحص الأسئلة المكررة):</span>
                </span>
                <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                  تطابق الإجابات: {activeSubmission.consistencyAnalysis.consistencyRate}% ({activeSubmission.consistencyAnalysis.consistentPairsCount} من {activeSubmission.consistencyAnalysis.repeatedPairsCount})
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                {activeSubmission.consistencyAnalysis.behaviorDescription}
              </p>
            </div>
          )}

          {/* Mandatory Disclaimer Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 flex items-start gap-2.5 leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">ملاحظة مهنية:</span>
              {settings.reportDisclaimer}
            </div>
          </div>

          {/* Simple Clean Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
            <div>{settings.schoolName} – {settings.platformName}</div>
            <div>المشرف: {settings.supervisorName}</div>
          </div>
        </div>
      ) : (
        /* School Summary Aggregate Report */
        <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-lg max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-2 print:m-0 print:max-w-none">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
            <div className="text-right space-y-1 text-xs font-bold leading-relaxed text-slate-800">
              <div>المملكة العربية السعودية - وزارة التعليم</div>
              <div className="font-extrabold text-sky-800">{settings.schoolName}</div>
              <div>وحدة الكشف عن الموهوبين</div>
            </div>

            <div className="text-center">
              <h1 className="text-lg font-black text-slate-900">
                التقرير الإحصائي الشامل لمؤشرات الكشف المبدئي
              </h1>
              <p className="text-xs text-slate-500">العام الدراسي 1447-1448هـ</p>
            </div>

            <div className="text-left text-xs text-slate-600">
              <div>التاريخ: {new Date().toLocaleDateString('ar-SA')}</div>
              <div>المشرف: {settings.supervisorName}</div>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-xs">
            <div>
              <span className="text-slate-500 block">إجمالي الطلاب المسجلين</span>
              <span className="text-xl font-black text-slate-900">{students.length} طالب</span>
            </div>
            <div>
              <span className="text-slate-500 block">الاختبارات المصححة</span>
              <span className="text-xl font-black text-slate-900">{submissions.length} اختبار</span>
            </div>
            <div>
              <span className="text-slate-500 block">متوسط المدرسة العام</span>
              <span className="text-xl font-black text-sky-700">
                {submissions.length > 0 ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / submissions.length) : 0}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">المرشحون مبدئياً</span>
              <span className="text-xl font-black text-emerald-700">
                {submissions.filter(s => s.candidateStatus === 'nominated_preliminary' || s.candidateStatus === 'reviewed_by_supervisor').length} طالب
              </span>
            </div>
          </div>

          {/* Submissions List Table */}
          <table className="w-full text-right text-xs border border-slate-300 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2.5">م</th>
                <th className="p-2.5">اسم الطالب</th>
                <th className="p-2.5">الصف</th>
                <th className="p-2.5">الدرجة</th>
                <th className="p-2.5">النسبة</th>
                <th className="p-2.5">القرار المبدئي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubmissions.map((sub, idx) => {
                const st = students.find(item => item.id === sub.studentId);
                const statusInfo = CANDIDATE_STATUS_INFO[sub.candidateStatus];
                return (
                  <tr key={sub.id}>
                    <td className="p-2.5 font-mono">{idx + 1}</td>
                    <td className="p-2.5 font-bold">{st?.fullName}</td>
                    <td className="p-2.5">{st?.classroom}</td>
                    <td className="p-2.5 font-mono">{sub.totalScore}/{sub.maxScore}</td>
                    <td className="p-2.5 font-mono font-bold text-sky-700">{sub.percentage}%</td>
                    <td className="p-2.5 font-semibold">{statusInfo?.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Disclaimer & Signatures */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950">
            {settings.reportDisclaimer}
          </div>

          <div className="pt-6 border-t-2 border-slate-900 flex justify-between text-xs font-bold text-slate-800">
            <div>مشرف الموهوبين: {settings.supervisorName}</div>
            <div>مدير المدرسة: إدارة مدارس رياض الإبداع الأهلية</div>
          </div>
        </div>
      )}
    </div>
  );
};
