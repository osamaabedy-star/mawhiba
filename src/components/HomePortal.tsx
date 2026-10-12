import React, { useState } from 'react';
import { SchoolLogo } from './SchoolLogo';
import { UserCheck, LayoutDashboard, Sparkles, GraduationCap, ShieldCheck, Hash, ArrowLeft } from 'lucide-react';
import { AppSettings } from '../types';

interface HomePortalProps {
  settings: AppSettings;
  onEnterStudent: () => void;
  onEnterByCode?: (code: string) => void;
  onEnterSupervisor: () => void;
  onOpenTests: () => void;
  onOpenResults: () => void;
}

export const HomePortal: React.FC<HomePortalProps> = ({
  settings,
  onEnterStudent,
  onEnterByCode,
  onEnterSupervisor,
}) => {
  const [examCodeInput, setExamCodeInput] = useState('');

  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-sky-400/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
        {/* Main Content Card */}
        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-2xl p-8 sm:p-14 text-center transition-all">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام الكشف المبدئي الذكي للموهوبين</span>
          </div>

          {/* Logo & Platform Name */}
          <div className="flex flex-col items-center justify-center mb-8 space-y-4">
            <div className="p-4 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 hover:scale-105 transition-transform duration-500">
              <SchoolLogo size={88} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {settings.platformName}
              </h1>
              <p className="text-base font-bold text-slate-500 dark:text-slate-400">
                {settings.schoolName}
              </p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8 max-w-md mx-auto">
             <div className="flex flex-col items-center gap-1 opacity-70">
                <GraduationCap className="w-4 h-4 text-sky-500" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">رعاية الموهبة</span>
             </div>
             <div className="flex flex-col items-center gap-1 opacity-70">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">بيئة آمنة</span>
             </div>
             <div className="flex flex-col items-center gap-1 opacity-70">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">تحليل ذكي</span>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterStudent}
              className="w-full sm:w-56 h-14 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-base font-black transition-all shadow-xl shadow-sky-600/20 hover:shadow-sky-600/40 cursor-pointer flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>دخول الطالب</span>
            </button>

            <button
              onClick={onEnterSupervisor}
              className="w-full sm:w-56 h-14 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-base font-black transition-all border-2 border-slate-200 dark:border-slate-700 shadow-md cursor-pointer flex items-center justify-center gap-3 group"
            >
              <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-400" />
              <span>دخول المشرف</span>
            </button>
          </div>

          {/* Quick Entry by Test Code */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 max-w-sm mx-auto w-full">
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>الدخول السريع بكود الاختبار:</span>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (examCodeInput.trim() && onEnterByCode) {
                  onEnterByCode(examCodeInput.trim());
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={examCodeInput}
                onChange={(e) => setExamCodeInput(e.target.value.toUpperCase())}
                placeholder="كود الاختبار (مثل TEST-01)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-xs font-mono font-black text-center tracking-wider focus:ring-2 focus:ring-indigo-500 text-indigo-900 dark:text-indigo-200"
              />
              <button
                type="submit"
                disabled={!examCodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>دخول</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Footer inside card */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
             <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                <span>تحت إشراف:</span>
                <span className="text-slate-600 dark:text-slate-300">منسق الموهوبين أسامة ابراهيم</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
