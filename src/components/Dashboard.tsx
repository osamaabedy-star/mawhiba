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
  const totalResults = submissions.length;

  // Filter for candidates (nominated)
  const nominatedSubmissions = submissions
    .filter(s => s.percentage >= (settings.minScoreForNomination || 60) || s.candidateStatus === 'nominated_preliminary')
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-4">
      {/* عنوان الصفحة الصغير والمختصر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              لوحة التحكم والمتابعة
            </h2>
            <div className="text-[10px] text-slate-500 font-bold">
              {settings.supervisorName} • منسق الموهوبين
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* إحصاءات سريعة جداً (Mini Stats Row) */}
          <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-center cursor-pointer" onClick={() => setActiveTab('students')}>
              <div className="text-[10px] text-slate-400 font-bold">الطلاب</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{totalStudents}</div>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center cursor-pointer" onClick={() => setActiveTab('test_builder')}>
              <div className="text-[10px] text-slate-400 font-bold">الاختبارات</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{totalTests}</div>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center cursor-pointer" onClick={() => setActiveTab('results')}>
              <div className="text-[10px] text-slate-400 font-bold">النتائج</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{totalResults}</div>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('students')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold transition-all shadow-sm shadow-sky-600/20 cursor-pointer"
          >
            <span>دخول سريع للنظام</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* العمود الأيمن: قائمة المرشحين (الأهم) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-900/50 overflow-hidden shadow-sm">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>قائمة الطلاب المرشحين (الموهوبين)</span>
              </h3>
              <button
                onClick={() => setActiveTab('nominations')}
                className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>إدارة الترشيحات</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>

            <div className="p-0">
              {nominatedSubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-slate-400 font-bold">لا يوجد مرشحون حالياً (أقل من {settings.minScoreForNomination}%)</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2">اسم الطالب</th>
                        <th className="px-4 py-2">الفصل</th>
                        <th className="px-4 py-2 text-center">الدرجة</th>
                        <th className="px-4 py-2 text-center">الحالة</th>
                        <th className="px-4 py-2 text-center">تقرير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {nominatedSubmissions.slice(0, 10).map(sub => {
                        const student = students.find(s => s.id === sub.studentId);
                        const statusInfo = CANDIDATE_STATUS_INFO[sub.candidateStatus];
                        return (
                          <tr key={sub.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                              {student?.fullName}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 font-medium">
                              {student?.classroom}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                                {sub.percentage}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo?.badgeClass}`}>
                                {statusInfo?.label}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => {
                                  onSelectSubmissionForReview(sub.id);
                                  setActiveTab('reports');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-sky-600 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
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
          </div>
        </div>

        {/* العمود الأيسر: أحدث النتائج العامة */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-700 dark:text-white">أحدث النتائج</h3>
              <button 
                onClick={() => setActiveTab('results')}
                className="text-[10px] font-bold text-sky-600 hover:underline cursor-pointer"
              >
                الكل
              </button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {submissions.slice(0, 6).map(sub => {
                const student = students.find(s => s.id === sub.studentId);
                return (
                  <div key={sub.id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                        {student?.fullName}
                      </div>
                      <div className="text-[9px] text-slate-400">{student?.classroom}</div>
                    </div>
                    <div className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      {sub.percentage}%
                    </div>
                  </div>
                );
              })}
              {submissions.length === 0 && (
                <div className="p-8 text-center text-[10px] text-slate-400 font-bold">لا توجد نتائج بعد</div>
              )}
            </div>
          </div>

          {/* تذكير هادئ */}
          <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
            <div className="text-[10px] font-bold text-sky-800 dark:text-sky-300 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>معلومة النظام</span>
            </div>
            <p className="text-[10px] text-sky-700 dark:text-sky-400 leading-relaxed">
              يتم تصنيف الطلاب كمرشحين (موهوبين) تلقائياً عند الحصول على درجة أعلى من {settings.minScoreForNomination}% في مقياس الاستعداد.
            </p>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium opacity-70">
        {settings.reportDisclaimer}
      </div>
    </div>
  );
};
