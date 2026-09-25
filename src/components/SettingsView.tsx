import React, { useState } from 'react';
import { AppSettings } from '../types';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle,
  Sparkles,
  Sliders,
  Database
} from 'lucide-react';
import { AppDatabaseState } from '../services/storage';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetAllData: () => void;
  fullDatabaseState: AppDatabaseState;
  onImportDatabase: (importedState: AppDatabaseState) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetAllData,
  fullDatabaseState,
  onImportDatabase,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSuccessMsg('تم حفظ وتحديث إعدادات المنصة بنجاح.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Export database JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullDatabaseState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `riyadh_ibda_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import database JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.questions && parsed.tests && parsed.students && parsed.submissions) {
            onImportDatabase(parsed);
            alert('تم استيراد قاعدة البيانات بنجاح وتحديث كافة السجلات.');
          } else {
            alert('صيغة الملف غير متوافقة مع قاعدة بيانات المنصة.');
          }
        } catch (err) {
          alert('فشل قراءة الملف، تأكد من سلامة ملف الـ JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>إعدادات النظام ومعايير الترشيح</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تخصيص هوية المدرسة، بيانات المشرف، عتبات درجات الترشيح، والنسخ الاحتياطي
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization & Supervisor Identity */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>بيانات المنشأة التعليمية وإشراف المنصة</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم الجهة التعليمية
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم المنصة المعتمد
              </label>
              <input
                type="text"
                value={formData.platformName}
                onChange={e => setFormData({ ...formData, platformName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المشرف على المنصة ومسؤول رعاية الموهوبين
              </label>
              <input
                type="text"
                value={formData.supervisorName}
                onChange={e => setFormData({ ...formData, supervisorName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المرحلة التعليمية المستهدفة
              </label>
              <input
                type="text"
                disabled
                value="من الصف الثالث الابتدائي حتى الصف الثالث المتوسط"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Nomination Thresholds */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>معايير وعتبات الفرز والترشيح المبدئي</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الحد الأدنى لنسبة الترشيح المبدئي (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50}
                  max={95}
                  value={formData.minScoreForNomination}
                  onChange={e => setFormData({ ...formData, minScoreForNomination: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
                <span className="text-xs text-slate-500 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">الطلاب الحاصلون على هذه النسبة فأعلى يُصنفون مبدئياً كمرشحين.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الحد الأدنى للمهارات المرتفعة المطلوبة (من 6)
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={formData.minHighSkillsForNomination}
                onChange={e => setFormData({ ...formData, minHighSkillsForNomination: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">عدد المهارات التي يجب أن يحقق فيها الطالب نسبة 75% فأكثر.</p>
            </div>
          </div>
        </div>

        {/* Question Counts per Grade */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>التحكم في عدد الأسئلة لكل صف دراسي</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            حدد عدد الأسئلة التي تظهر للطالب في كل محاولة اختبار بحسب صفه الدراسي.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(Object.entries(formData.questionCounts || {}) as [string, number][]).map(([grade, count]) => {
              const gradeLabel = {
                g3_primary: 'الثالث الابتدائي',
                g4_primary: 'الرابع الابتدائي',
                g5_primary: 'الخامس الابتدائي',
                g6_primary: 'السادس الابتدائي',
                g1_middle: 'الأول المتوسط',
                g2_middle: 'الثاني المتوسط',
                g3_middle: 'الثالث المتوسط',
              }[grade] || grade;

              return (
                <div key={grade}>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {gradeLabel}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={count}
                    onChange={e => setFormData({
                      ...formData,
                      questionCounts: {
                        ...formData.questionCounts,
                        [grade]: Number(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer Text Editor */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>نص التنويه والإخلاء المهني المعتمد في التقارير</span>
          </h3>

          <div>
            <textarea
              rows={3}
              value={formData.reportDisclaimer}
              onChange={e => setFormData({ ...formData, reportDisclaimer: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              يظهر هذا التنويه إلزامياً في كل تقرير مطبوع وفي واجهة النتيجة للطالب لضمان الدقة والمهنية.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتطبيق الإعدادات</span>
          </button>
        </div>
      </form>

      {/* Database Management & Backups */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>النسخ الاحتياطي وإدارة البيانات</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>تصدير نسخة احتياطية (JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>استيراد نسخة احتياطية</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={() => {
              if (confirm('تحذير: هل أنت متأكد من رغبتك في إعادة ضبط المنصة بالكامل واستعادة البيانات الافتراضية؟')) {
                onResetAllData();
                alert('تمت إعادة تعيين البيانات بنجاح.');
              }
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>استعادة البيانات الافتراضية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
