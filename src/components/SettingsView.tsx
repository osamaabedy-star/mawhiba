import React, { useState } from 'react';
import { AppSettings, GradeLevel, GRADE_LABELS } from '../types';
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
  Database,
  Building2,
  Clock,
  Award,
  FileCheck,
  Layers,
  HelpCircle
} from 'lucide-react';
import { AppDatabaseState } from '../services/storage';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetAllData: () => void;
  fullDatabaseState: AppDatabaseState;
  onImportDatabase: (importedState: AppDatabaseState) => void;
}

export type SettingsTab = 'platform' | 'exam_defaults' | 'data_management';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetAllData,
  fullDatabaseState,
  onImportDatabase,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('platform');
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSuccessMsg('تم حفظ وتحديث الإعدادات بنجاح.');
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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>إعدادات النظام والمنصة</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة هوية المنشأة، المعايير الافتراضية للاختبارات، النسخ الاحتياطي وإدارة البيانات
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('platform')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'platform'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>إعدادات المنصة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exam_defaults')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'exam_defaults'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>إعدادات الاختبار الافتراضية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data_management')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'data_management'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>إدارة البيانات</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: إعدادات المنصة */}
      {activeTab === 'platform' && (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in">
          {/* Organization & Supervisor Identity */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  بيانات المنشأة التعليمية وإشراف المنصة
                </h3>
                <p className="text-[11px] text-slate-500">هذه البيانات تظهر في ترويسات الاختبارات الرسمية والتقارير المطبوعة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الجهة التعليمية / المدرسة
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="مثال: مدارس الرياض الأهلية / مجمع الإبداع"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المنصة المعتمد
                </label>
                <input
                  type="text"
                  value={formData.platformName}
                  onChange={e => setFormData({ ...formData, platformName: e.target.value })}
                  placeholder="منصة مقياس موهبة للقدرات العقلية المتعددة"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المشرف على المنصة ومسؤول رعاية الموهوبين
                </label>
                <input
                  type="text"
                  value={formData.supervisorName}
                  onChange={e => setFormData({ ...formData, supervisorName: e.target.value })}
                  placeholder="أ. أسامة عبيدي"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  مدير المدرسة / قائد المجمع
                </label>
                <input
                  type="text"
                  value={formData.principalName || ''}
                  onChange={e => setFormData({ ...formData, principalName: e.target.value })}
                  placeholder="أ. ماجد بن سعد الخثعمي"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المرحلة التعليمية المستهدفة
                </label>
                <input
                  type="text"
                  disabled
                  value="من الصف الثالث الابتدائي حتى الصف الثالث المتوسط (المستويات 1 و 2 و 3)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          {/* Disclaimer Text Editor */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  نص التنويه والإخلاء المهني المعتمد في التقارير
                </h3>
                <p className="text-[11px] text-slate-500">يظهر هذا التنويه في أسفل كافة تقارير الطلاب المطبوعة لضمان الدقة والمهنية</p>
              </div>
            </div>

            <div>
              <textarea
                rows={3}
                value={formData.reportDisclaimer}
                onChange={e => setFormData({ ...formData, reportDisclaimer: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed font-medium"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتطبيق إعدادات المنصة</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: إعدادات الاختبار الافتراضية */}
      {activeTab === 'exam_defaults' && (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in">
          {/* Nomination Thresholds */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  معايير وعتبات الفرز والترشيح المبدئي لموهبة
                </h3>
                <p className="text-[11px] text-slate-500">الضوابط الرقمية لتحديد أهلية الطالب للترشيح المبدئي لمقياس موهبة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  الحد الأدنى لنسبة الترشيح المبدئي (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={95}
                    value={formData.minScoreForNomination}
                    onChange={e => setFormData({ ...formData, minScoreForNomination: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black"
                  />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-black">%</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  الطلاب الحاصلون على هذه النسبة فأعلى يُصنفون تلقائياً كـ (مرشح مبدئياً) في كشوف النتائج.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  الحد الأدنى للمهارات المرتفعة المطلوبة (من 6)
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={formData.minHighSkillsForNomination}
                  onChange={e => setFormData({ ...formData, minHighSkillsForNomination: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  عدد المهارات التي يجب أن يحقق فيها الطالب نسبة 75% فأكثر لاعتباره متميزاً متعدد المهارات.
                </p>
              </div>
            </div>
          </div>

          {/* Question Counts per Grade */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  التحكم في عدد الأسئلة الافتراضي لكل صف دراسي
                </h3>
                <p className="text-[11px] text-slate-500">
                  حدد عدد الأسئلة الافتراضي عند توليد الاختبارات لكل مرحلة وصف دراسي
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
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
                  <div key={grade} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                    <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                      {gradeLabel}
                    </label>
                    <div className="flex items-center gap-2">
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
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      />
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">سؤال</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتطبيق إعدادات الاختبارات</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: إدارة البيانات */}
      {activeTab === 'data_management' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Backup & Restore */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  النسخ الاحتياطي وحفظ البيانات
                </h3>
                <p className="text-[11px] text-slate-500">
                  تصدير نسخة كاملة من الطلاب والأسئلة والاختبارات والنتائج بصيغة JSON آمنة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-sky-600" />
                    <span>تصدير نسخة احتياطية (Backup)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    حفظ ملف يشمل بنك الأسئلة بالكامل، جميع الطلاب، كافة الاختبارات، وجميع سجلات النتائج.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل النسخة الاحتياطية (JSON)</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>استيراد نسخة احتياطية (Restore)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    استرجاع بيانات المنصة من ملف JSON احتياطي سابق لاستئناف العمل على أي جهاز.
                  </p>
                </div>
                <label className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>اختيار ملف النسخة الاحتياطية</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Reset System Danger Zone */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                  إعادة ضبط المصنع واستعادة البيانات الافتراضية
                </h3>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  إعادة تهيئة النظام وحذف التعديلات واستعادة الأسئلة والاختبارات النموذجية الأصلية
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                ⚠️ تحذير: هذه العملية ستقوم بإعادة تعيين قاعدة البيانات إلى البنك النموذجي المعتمد.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('تحذير نهائي: هل أنت متأكد من رغبتك في إعادة ضبط المنصة بالكامل واستعادة البيانات الافتراضية؟')) {
                    onResetAllData();
                    alert('تمت إعادة تعيين البيانات بنجاح.');
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط المصنع الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
