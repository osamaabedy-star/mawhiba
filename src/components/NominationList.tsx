import React, { useState } from 'react';
import { 
  ExamSubmission, 
  Student, 
  Test, 
  AppSettings, 
  CandidateStatus, 
  CANDIDATE_STATUS_INFO,
  SkillCategory,
  SKILL_DEFINITIONS
} from '../types';
import { 
  Award, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Printer, 
  MessageSquare, 
  Save, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface NominationListProps {
  submissions: ExamSubmission[];
  students: Student[];
  tests: Test[];
  settings: AppSettings;
  onUpdateCandidateStatus: (submissionId: string, status: CandidateStatus, notes?: string) => void;
  onOpenReportForSubmission: (submissionId: string) => void;
}

export const NominationList: React.FC<NominationListProps> = ({
  submissions,
  students,
  tests,
  settings,
  onUpdateCandidateStatus,
  onOpenReportForSubmission,
}) => {
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all_candidates');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>('');

  // Filter for candidates & review cases
  const candidateSubmissions = submissions.filter(s => {
    if (selectedStatusTab === 'all_candidates') {
      return s.percentage >= 60 || s.candidateStatus === 'nominated_preliminary' || s.candidateStatus === 'reviewed_by_supervisor' || s.candidateStatus === 'needs_review';
    }
    return s.candidateStatus === selectedStatusTab;
  });

  const handleStartEditNotes = (sub: ExamSubmission) => {
    setEditingNotesId(sub.id);
    setNotesText(sub.supervisorNotes || '');
  };

  const handleSaveNotes = (subId: string, currentStatus: CandidateStatus) => {
    onUpdateCandidateStatus(subId, currentStatus, notesText);
    setEditingNotesId(null);
  };

  const handlePrintNominationList = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200">
              قائمة الفرز والتحقق
            </span>
            <span className="text-xs text-slate-400">معيار الترشيح المعتمد: ≥ {settings.minScoreForNomination}%</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span>قائمة الترشيح والمراجعة المبدئية للطلاب الموهوبين</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            مراجعة نوعية للطلاب ذوي الاستعدادات والقدرات العالية وتوثيق قرارات المشرف أ. {settings.supervisorName}
          </p>
        </div>

        <button
          onClick={handlePrintNominationList}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer no-print shrink-0"
        >
          <Printer className="w-4 h-4 text-sky-600" />
          <span>طباعة كشف المرشحين</span>
        </button>
      </div>

      {/* Status Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        <button
          onClick={() => setSelectedStatusTab('all_candidates')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedStatusTab === 'all_candidates'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
          }`}
        >
          كافة المرشحين والمؤهلين ({submissions.filter(s => s.percentage >= 60).length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('nominated_preliminary')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedStatusTab === 'nominated_preliminary'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
          }`}
        >
          مرشح مبدئياً ({submissions.filter(s => s.candidateStatus === 'nominated_preliminary').length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('needs_review')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedStatusTab === 'needs_review'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
          }`}
        >
          يحتاج مراجعة نوعية ({submissions.filter(s => s.candidateStatus === 'needs_review').length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('reviewed_by_supervisor')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedStatusTab === 'reviewed_by_supervisor'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
          }`}
        >
          تمت مراجعة المشرف ({submissions.filter(s => s.candidateStatus === 'reviewed_by_supervisor').length})
        </button>
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidateSubmissions.map(sub => {
          const student = students.find(s => s.id === sub.studentId);
          const test = tests.find(t => t.id === sub.testId);
          const statusInfo = CANDIDATE_STATUS_INFO[sub.candidateStatus];

          return (
            <div
              key={sub.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
            >
              {/* Card Top: Student Name, Score & Status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {student?.fullName || 'طالب مجهول'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{student?.classroom}</span>
                    <span>•</span>
                    <span className="font-mono">{student?.nationalId}</span>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {sub.percentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    ({sub.totalScore}/{sub.maxScore} درجة)
                  </span>
                </div>
              </div>

              {/* Status Badge & Selector */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${statusInfo.badgeClass}`}>
                  {statusInfo.label}
                </span>

                <div className="flex items-center gap-1.5 no-print">
                  <span className="text-[11px] text-slate-500 font-semibold">تغيير القرار:</span>
                  <select
                    value={sub.candidateStatus}
                    onChange={e => onUpdateCandidateStatus(sub.id, e.target.value as CandidateStatus, sub.supervisorNotes)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {(Object.keys(CANDIDATE_STATUS_INFO) as CandidateStatus[]).map(st => (
                      <option key={st} value={st}>{CANDIDATE_STATUS_INFO[st].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cognitive Strengths Pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  المهارات العقلية البارزة:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sub.strengths.length > 0 ? (
                    sub.strengths.map((st, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                        ✓ {st}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">أداء متقارب عبر كافة المجالات</span>
                  )}
                </div>
              </div>

              {/* Supervisor Notes Block */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                    <span>ملاحظات المشرف وتوصية الترشيح:</span>
                  </span>
                  {editingNotesId !== sub.id && (
                    <button
                      onClick={() => handleStartEditNotes(sub)}
                      className="text-[11px] text-sky-600 hover:underline cursor-pointer no-print"
                    >
                      تعديل الملاحظات
                    </button>
                  )}
                </div>

                {editingNotesId === sub.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={notesText}
                      onChange={e => setNotesText(e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="اكتب ملاحظات المشرف والمبررات..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleSaveNotes(sub.id, sub.candidateStatus)}
                        className="px-3 py-1 bg-sky-600 text-white rounded-lg text-xs font-bold"
                      >
                        حفظ
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    "{sub.supervisorNotes || 'لا توجد ملاحظات مدونة بعد.'}"
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 flex items-center justify-between text-xs no-print">
                <span className="text-[11px] text-slate-400 font-mono">
                  {test?.title}
                </span>

                <button
                  onClick={() => onOpenReportForSubmission(sub.id)}
                  className="flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700"
                >
                  <span>عرض التقرير الفردي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {candidateSubmissions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-2">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            لا توجد حالات مطابقة لمعيار التصفية المختار
          </h3>
        </div>
      )}
    </div>
  );
};
