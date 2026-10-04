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

      {/* Compact Candidate List (Simplified Table-like structure) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3">الطالب المرشح</th>
                <th className="px-4 py-3">الصف</th>
                <th className="px-4 py-3">النسبة</th>
                <th className="px-4 py-3">الحالة والقرار</th>
                <th className="px-4 py-3">المهارات المتميزة</th>
                <th className="px-5 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {candidateSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                    لا توجد حالات مطابقة لمعيار التصفية المختار
                  </td>
                </tr>
              ) : (
                candidateSubmissions.map(sub => {
                  const student = students.find(s => s.id === sub.studentId);
                  const statusInfo = CANDIDATE_STATUS_INFO[sub.candidateStatus];

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                      {/* 1. Student Info */}
                      <td className="px-5 py-3">
                        <div className="font-black text-slate-900 dark:text-white">{student?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{student?.nationalId}</div>
                      </td>

                      {/* 2. Grade/Class */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-bold">
                        {student?.classroom}
                      </td>

                      {/* 3. Score */}
                      <td className="px-4 py-3">
                        <span className={`text-sm font-black ${sub.percentage >= settings.minScoreForNomination ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {sub.percentage}%
                        </span>
                      </td>

                      {/* 4. Status Selector */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                          <select
                            value={sub.candidateStatus}
                            onChange={e => onUpdateCandidateStatus(sub.id, e.target.value as CandidateStatus, sub.supervisorNotes)}
                            className="px-1 py-0.5 text-[9px] font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 no-print"
                          >
                            {(Object.keys(CANDIDATE_STATUS_INFO) as CandidateStatus[]).map(st => (
                              <option key={st} value={st}>{CANDIDATE_STATUS_INFO[st].label}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 5. Strengths */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sub.strengths.slice(0, 2).map((st, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-100">
                              {st}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenReportForSubmission(sub.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 font-bold text-[10px] hover:bg-sky-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>عرض التقرير</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
