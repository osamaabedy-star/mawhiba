import React from 'react';
import { 
  UserRole, 
  AppSettings 
} from '../types';
import { 
  LayoutDashboard, 
  HelpCircle, 
  Layers, 
  Users, 
  BarChart3, 
  FileText, 
  Settings,
  UserCheck,
  Home,
  LogOut,
  Cloud
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

export type ActiveTab = 
  | 'home'
  | 'dashboard' 
  | 'students'
  | 'question_bank' 
  | 'test_builder' 
  | 'results' 
  | 'nominations'
  | 'reports' 
  | 'settings';

interface NavbarProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: AppSettings;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLaunchStudentExam: () => void;
  isSupervisor?: boolean;
  onLogout?: () => void;
  onSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  setRole,
  activeTab,
  setActiveTab,
  settings,
  onLaunchStudentExam,
  isSupervisor,
  onLogout,
  onSync,
}) => {
  const navTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'students', label: 'الطلاب', icon: <Users className="w-4 h-4" /> },
    { id: 'question_bank', label: 'بنك الأسئلة', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'test_builder', label: 'الاختبارات', icon: <Layers className="w-4 h-4" /> },
    { id: 'results', label: 'النتائج', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', label: 'التقارير', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 no-print transition-colors">
      {/* الشريط العلوي البسيط والاحترافي */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* شعار المدرسة وعنوان المنصة */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
          title="العودة للصفحة الرئيسية"
        >
          <div className="p-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
            <SchoolLogo size={36} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
              {settings.schoolName}
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {settings.platformName}
            </div>
          </div>
        </div>

        {/* معلومات المشرف وأزرار الوصول المباشر */}
        <div className="flex items-center gap-3">
          {isSupervisor && (
            <>
              <button
                onClick={onSync}
                className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer"
                title="مزامنة البيانات مع السحابة"
              >
                <Cloud className="w-5 h-5" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="hidden sm:block text-left border-l border-slate-200 dark:border-slate-700 pl-3">
            <div className="text-[11px] text-slate-400 font-medium">المشرف</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{settings.supervisorName}</div>
          </div>

          {/* زر بوابة الصفحة الرئيسية */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">الصفحة الرئيسية</span>
          </button>

          {/* زر دخول الطالب المباشر */}
          <button
            onClick={onLaunchStudentExam}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <UserCheck className="w-4 h-4" />
            <span>دخول الطالب</span>
          </button>
        </div>
      </div>

      {/* شريط تبويبات لوحة المشرف (الرئيسية، الطلاب، بنك الأسئلة، الاختبارات، النتائج، التقارير، الإعدادات) */}
      {activeTab !== 'home' && (
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
