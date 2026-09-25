import React, { useState } from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number;
}

export const SCHOOL_LOGO_URL = 'https://www.wzufa.com/wp-content/uploads/2022/07/Riyadh-Al-Ebdaa-Schools.png';

/**
 * شعار مدارس رياض الإبداع الأهلية
 * يعرض الشعار الرسمي المعتمد للمدارس مع بديل هندسي احترافي في حال تعذر التحميل
 */
export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = 'w-10 h-10', size = 40 }) => {
  const [hasError, setHasError] = useState(false);

  if (!hasError) {
    return (
      <img
        src={SCHOOL_LOGO_URL}
        alt="شعار مدارس رياض الإبداع الأهلية"
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${className} object-contain`}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="شعار مدارس رياض الإبداع الأهلية"
    >
      <circle cx="50" cy="50" r="46" fill="#0284C7" fillOpacity="0.08" stroke="#0284C7" strokeWidth="2.5" />
      {/* درع الهوية المدرسية */}
      <path
        d="M50 14L24 24V48C24 64 35 78 50 84C65 78 76 64 76 48V24L50 14Z"
        fill="#0284C7"
      />
      {/* صفحات كتاب مفتوح */}
      <path
        d="M50 36C45 32 38 32 32 34V60C38 58 45 58 50 62C55 58 62 58 68 60V34C62 32 55 32 50 36Z"
        fill="white"
      />
      <path d="M50 36V62" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M50 22C52 26 55 28 55 31C55 33.76 52.76 36 50 36C47.24 36 45 33.76 45 31C45 28 48 26 50 22Z"
        fill="#F59E0B"
      />
      <circle cx="50" cy="72" r="3" fill="white" />
    </svg>
  );
};

