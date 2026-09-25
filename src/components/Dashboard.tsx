import React from 'react';
import { 
  Question, 
  Test, 
  Student, 
  ExamSubmission, 
  AppSettings, 
  CANDIDATE_STATUS_INFO 
} from '../types';
import { 
  Users, 
  Layers, 
  FileSpreadsheet, 
  Award, 
  ArrowLeft,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface DashboardProps {
  questions: Question[];
  tests: Test[];
  students: Student[];
  submissions: ExamSubmission[];
  settings: AppSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuestionModal: () => void;
  onSelectSubmissionForReview: (submissionId: string) => void;
}

/**
 * لوحة المشرف - الصفحة الرئيسية
 * تصميم نظيف، بسيط، يعرض 4 بطاقات صغيرة فقط مع إحصاءات مختصرة
 */
export const Dashboard: React.FC<DashboardProps> = ({
  questions,
  tests,
  students,
  submissions,
  settings,
  setActiveTab,
  onSelectSubmissionForReview,
}) => {
  const totalStudents = students.length;
  const totalTests = tests.length;
  const totalModels = tests.reduce((acc, t) => acc + (t.models ? t.models.length : 1), 0);
  const totalResults = submissions.length;

  return (
    <div className="space-y-6">
      {/* عنوان الصفحة البسيط */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            لوحة المشرف
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {settings.schoolName} • {settings.supervisorTitle}: {settings.supervisorName}
          </p>
          <div className="mt-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
            منسق الموهوبين أسامة ابراهيم
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-4 h-4" />
          <span>نظام الكشف المبدئي نشط</span>
        </div>
      </div>

      {/* البطاقات الأربع الصغيرة مع إحصاءات مختصرة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. بطاقة الطلاب */}
        <div 
          onClick={() => setActiveTab('students')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">الطلاب</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            {totalStudents}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-sky-600">
            <span>إدارة الطلاب المسجلين</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </div>

        {/* 2. بطاقة الاختبارات */}
        <div 
          onClick={() => setActiveTab('test_builder')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">الاختبارات</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            {totalTests}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-indigo-600">
            <span>الاختبارات المخصصة للطلاب</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </div>

        {/* 3. بطاقة النماذج */}
        <div 
          onClick={() => setActiveTab('question_bank')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">النماذج</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            {totalModels}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-teal-600">
            <span>نماذج الأسئلة المقننة ({questions.length} سؤال)</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </div>

        {/* 4. بطاقة النتائج */}
        <div 
          onClick={() => setActiveTab('results')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">النتائج</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            {totalResults}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-emerald-600">
            <span>الاختبارات المكتملة</span>
            <ArrowLeft className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* جدول النتائج الأخيرة المختصر */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            أحدث نتائج الاختبارات
          </h3>
          <button
            onClick={() => setActiveTab('results')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-1"
          >
            <span>عرض كافة النتائج</span>
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            لا توجد اختبارات مكتملة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">الاختبار</th>
                  <th className="px-4 py-3">النسبة المئوية</th>
                  <th className="px-4 py-3">الحالة المبدئية</th>
                  <th className="px-4 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {submissions.slice(0, 5).map(sub => {
                  const student = students.find(s => s.id === sub.studentId);
                  const test = tests.find(t => t.id === sub.testId);
                  const statusInfo = CANDIDATE_STATUS_INFO[sub.candidateStatus];
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {student?.fullName || 'طالب'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {test?.title || 'اختبار الكشف'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-sky-700 dark:text-sky-400">
                        {sub.percentage}%
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block border ${statusInfo?.badgeClass || 'bg-slate-100 text-slate-700'}`}
                        >
                          {statusInfo?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            onSelectSubmissionForReview(sub.id);
                            setActiveTab('reports');
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                          title="عرض التقرير"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* التنويه المعتمد الهادئ في الأسفل */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-[11px] text-slate-500 dark:text-slate-400 text-center">
        {settings.reportDisclaimer}
      </div>
    </div>
  );
};
