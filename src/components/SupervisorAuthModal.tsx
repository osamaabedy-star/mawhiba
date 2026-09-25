import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, ArrowLeft, X, CheckCircle2, Chrome } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { signInWithGoogle } from '../services/firebase';

interface SupervisorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetTabName?: string;
}

export const SUPERVISOR_AUTHORIZED_EMAIL = 'osamaabedy@gmail.com';

export const SupervisorAuthModal: React.FC<SupervisorAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetTabName,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithGoogle();
      if (result.user.email?.toLowerCase() === SUPERVISOR_AUTHORIZED_EMAIL) {
        setIsSuccessState(true);
        setTimeout(() => {
          setIsSuccessState(false);
          onSuccess();
        }, 800);
      } else {
        setErrorMsg('عذراً، هذا الحساب غير مصرح له بالدخول كمشرف.');
      }
    } catch (error: any) {
      console.error('Google Sign-in Error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Just silent or simple msg
      } else {
        setErrorMsg('حدث خطأ أثناء تسجيل الدخول عبر جوجل.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = emailInput.trim().toLowerCase();

    if (!cleanInput) {
      setErrorMsg('يرجى إدخال كلمة المرور للمشرف');
      return;
    }

    // Simplified for legacy support, but we recommend Google Sign-in
    if (cleanInput === SUPERVISOR_AUTHORIZED_EMAIL || cleanInput === '123456') {
      setErrorMsg('');
      setIsSuccessState(true);
      setTimeout(() => {
        setIsSuccessState(false);
        setEmailInput('');
        onSuccess();
      }, 500);
    } else {
      setErrorMsg('عذراً، كلمة المرور غير صحيحة. يرجى مراجعة الإدارة.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Logo */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/80 border border-sky-100 dark:border-sky-900">
            <SchoolLogo size={44} />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
              <Lock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>منطقة المشرف التربوي</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              التحقق من هوية المشرف
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              {targetTabName ? `للوصول إلى ${targetTabName}، ` : 'للوصول إلى لوحة الإشراف، '}
              يرجى تأكيد بريدك الإلكتروني المعتمد.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isSuccessState}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-500 text-slate-700 font-bold text-sm transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <Chrome className="w-5 h-5 text-sky-600" />
              <span>الدخول عبر حساب جوجل (المشرف)</span>
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[10px] text-slate-400 font-black">أو عبر كلمة المرور</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
              كلمة مرور المشرف:
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                dir="ltr"
                value={emailInput}
                onChange={e => {
                  setEmailInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="أدخل كلمة المرور..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 text-right">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">عذراً، كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.</span>
            </div>
          )}

          {/* Success State */}
          {isSuccessState && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 text-right">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>تم التحقق بنجاح! جاري تحويلك للوحة الإشراف...</span>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="submit"
              disabled={isSuccessState}
              className="w-full sm:flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تأكيد الدخول للإشراف</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[11px] text-slate-400">
            مدارس رياض الإبداع الأهلية – الدخول مخصص للمشرف المعتمد
          </span>
        </div>
      </div>
    </div>
  );
};
