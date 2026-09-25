import React from 'react';

interface VisualShapeProps {
  type: string;
  className?: string;
  size?: number;
}

export const VisualShape: React.FC<VisualShapeProps> = ({ type, className = '', size = 200 }) => {
  switch (type) {
    case 'matrix_3x3_pattern':
      // 3x3 pattern matrix with missing bottom-right cell (?)
      return (
        <svg width={size} height={size} viewBox="0 0 200 200" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Grid lines */}
          <line x1="66" y1="10" x2="66" y2="190" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="133" y1="10" x2="133" y2="190" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="10" y1="66" x2="190" y2="66" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="10" y1="133" x2="190" y2="133" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2" />

          {/* Row 1: 1 dot, 2 dots, 3 dots */}
          <circle cx="38" cy="38" r="8" fill="#0284c7" />
          
          <circle cx="95" cy="38" r="8" fill="#0284c7" />
          <circle cx="105" cy="38" r="8" fill="#0284c7" />
          
          <circle cx="155" cy="38" r="7" fill="#0284c7" />
          <circle cx="166" cy="38" r="7" fill="#0284c7" />
          <circle cx="177" cy="38" r="7" fill="#0284c7" />

          {/* Row 2: 1 square, 2 squares, 3 squares */}
          <rect x="30" y="92" width="16" height="16" fill="#10b981" rx="2" />

          <rect x="88" y="92" width="14" height="14" fill="#10b981" rx="2" />
          <rect x="106" y="92" width="14" height="14" fill="#10b981" rx="2" />

          <rect x="148" y="92" width="12" height="12" fill="#10b981" rx="2" />
          <rect x="163" y="92" width="12" height="12" fill="#10b981" rx="2" />
          <rect x="178" y="92" width="12" height="12" fill="#10b981" rx="2" />

          {/* Row 3: 1 triangle, 2 triangles, ? */}
          <polygon points="38,155 48,175 28,175" fill="#f59e0b" />

          <polygon points="94,156 102,174 86,174" fill="#f59e0b" />
          <polygon points="112,156 120,174 104,174" fill="#f59e0b" />

          {/* Target ? */}
          <rect x="142" y="142" width="48" height="48" fill="#fef2f2" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" rx="6" />
          <text x="166" y="175" textAnchor="middle" fill="#dc2626" fontSize="28" fontWeight="bold">؟</text>
        </svg>
      );

    case 'gears_mechanical':
      // 3 interlocking gears A, B, C
      return (
        <svg width={size} height={size * 0.72} viewBox="0 0 240 160" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          <rect x="10" y="10" width="220" height="140" fill="#f8fafc" rx="8" />
          
          {/* Gear A */}
          <g transform="translate(55, 80)">
            <circle cx="0" cy="0" r="30" fill="#e2e8f0" stroke="#475569" strokeWidth="3" />
            <circle cx="0" cy="0" r="10" fill="#64748b" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <rect key={angle} x="-4" y="-36" width="8" height="10" fill="#475569" transform={`rotate(${angle})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">الترس (أ)</text>
            <text x="0" y="-43" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="bold">يدور مع العقارب ↷</text>
          </g>

          {/* Gear B */}
          <g transform="translate(120, 80)">
            <circle cx="0" cy="0" r="26" fill="#f1f5f9" stroke="#64748b" strokeWidth="3" />
            <circle cx="0" cy="0" r="8" fill="#94a3b8" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <rect key={angle} x="-4" y="-32" width="8" height="8" fill="#64748b" transform={`rotate(${angle + 22.5})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="bold">الترس (ب)</text>
          </g>

          {/* Gear C */}
          <g transform="translate(182, 80)">
            <circle cx="0" cy="0" r="28" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            <circle cx="0" cy="0" r="10" fill="#b45309" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <rect key={angle} x="-4" y="-34" width="8" height="9" fill="#d97706" transform={`rotate(${angle})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="bold">الترس (ج)</text>
            <text x="0" y="48" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="bold">اتجاه الدوران؟ (؟)</text>
          </g>
        </svg>
      );

    case 'balance_scale':
      // Two-pan balance scale
      return (
        <svg width={size} height={size * 0.72} viewBox="0 0 240 160" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Base */}
          <polygon points="120,40 135,140 105,140" fill="#64748b" />
          <rect x="80" y="140" width="80" height="12" fill="#334155" rx="3" />
          
          {/* Beam */}
          <line x1="40" y1="45" x2="200" y2="45" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
          <circle cx="120" cy="45" r="6" fill="#f59e0b" />

          {/* Left strings and pan */}
          <line x1="40" y1="45" x2="25" y2="95" stroke="#94a3b8" strokeWidth="2" />
          <line x1="40" y1="45" x2="55" y2="95" stroke="#94a3b8" strokeWidth="2" />
          <path d="M 15 95 Q 40 115 65 95 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />

          {/* Left weights: 1 Cylinder + 1 Sphere */}
          <rect x="25" y="70" width="16" height="20" fill="#10b981" rx="3" />
          <circle cx="50" cy="85" r="8" fill="#0284c7" />

          {/* Equal sign */}
          <text x="120" y="30" textAnchor="middle" fill="#047857" fontSize="16" fontWeight="bold">متزن تماماً =</text>

          {/* Right strings and pan */}
          <line x1="200" y1="45" x2="185" y2="95" stroke="#94a3b8" strokeWidth="2" />
          <line x1="200" y1="45" x2="215" y2="95" stroke="#94a3b8" strokeWidth="2" />
          <path d="M 175 95 Q 200 115 225 95 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />

          {/* Right weights: 3 Spheres */}
          <circle cx="188" cy="85" r="8" fill="#0284c7" />
          <circle cx="202" cy="85" r="8" fill="#0284c7" />
          <circle cx="214" cy="85" r="8" fill="#0284c7" />
        </svg>
      );

    case 'scissors_lever':
      // Scissors lever with clearly labeled badges 1, 2, 3, 4
      return (
        <svg width={size} height={size * 0.75} viewBox="0 0 280 180" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Subtle grid background */}
          <rect x="0" y="0" width="280" height="180" fill="#f8fafc" rx="12" />
          <text x="140" y="24" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">رافعة المقص - حدد محور الارتكاز</text>

          {/* Blade 1 (Top-left to center) */}
          <path d="M 35 60 Q 90 75 140 90 L 140 96 Q 80 82 35 60 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
          {/* Blade 2 (Bottom-left to center) */}
          <path d="M 35 120 Q 90 105 140 90 L 140 84 Q 80 98 35 120 Z" fill="#94a3b8" stroke="#475569" strokeWidth="2" />

          {/* Central Pivot Screw (Point 3) */}
          <circle cx="140" cy="90" r="14" fill="#f59e0b" stroke="#b45309" strokeWidth="2.5" />
          <circle cx="140" cy="90" r="6" fill="#78350f" />

          {/* Handle 1 (Top right) */}
          <path d="M 140 84 Q 180 65 210 65 C 240 65 250 85 240 100 C 230 115 210 105 200 90 Q 170 85 140 84" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <ellipse cx="225" cy="85" rx="14" ry="12" fill="#f8fafc" stroke="#1d4ed8" strokeWidth="2" />

          {/* Handle 2 (Bottom right) */}
          <path d="M 140 96 Q 180 115 210 115 C 240 115 250 95 240 80 C 230 65 210 75 200 90 Q 170 95 140 96" fill="#2563eb" stroke="#1e40af" strokeWidth="2" />
          <ellipse cx="225" cy="95" rx="14" ry="12" fill="#f8fafc" stroke="#1e40af" strokeWidth="2" />

          {/* Badges 1, 2, 3, 4 with arrows */}
          {/* Badge 1: Blade tip */}
          <line x1="35" y1="60" x2="35" y2="35" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="35" cy="35" r="13" fill="#ef4444" stroke="#fff" strokeWidth="2" />
          <text x="35" y="39" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">1</text>
          <text x="35" y="20" textAnchor="middle" fill="#dc2626" fontSize="9" fontWeight="bold">طرف النصل</text>

          {/* Badge 2: Cutting edge */}
          <line x1="85" y1="73" x2="85" y2="45" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="85" cy="45" r="13" fill="#0284c7" stroke="#fff" strokeWidth="2" />
          <text x="85" y="49" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">2</text>
          <text x="85" y="30" textAnchor="middle" fill="#0369a1" fontSize="9" fontWeight="bold">الحد القاطع</text>

          {/* Badge 3: Pivot Fulcrum (Correct Answer) */}
          <line x1="140" y1="104" x2="140" y2="145" stroke="#d97706" strokeWidth="2.5" />
          <circle cx="140" cy="145" r="15" fill="#f59e0b" stroke="#78350f" strokeWidth="2.5" />
          <text x="140" y="150" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="black">3</text>
          <text x="140" y="172" textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="black">المسمار المحوري</text>

          {/* Badge 4: Handle / Effort */}
          <line x1="225" y1="110" x2="225" y2="145" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="225" cy="145" r="13" fill="#10b981" stroke="#fff" strokeWidth="2" />
          <text x="225" y="149" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">4</text>
          <text x="225" y="170" textAnchor="middle" fill="#047857" fontSize="9" fontWeight="bold">المقبض</text>
        </svg>
      );

    case 'mental_rotation_90':
      // Spatial mental rotation of an asymmetric polygon
      return (
        <svg width={size} height={size * 0.75} viewBox="0 0 280 170" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          <rect x="0" y="0" width="280" height="170" fill="#f8fafc" rx="12" />
          
          {/* Left: Original Shape (0 deg) */}
          <g transform="translate(65, 85)">
            <rect x="-45" y="-55" width="90" height="110" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" rx="8" />
            <text x="0" y="-40" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">الشكل الأصلي (0°)</text>
            
            {/* L-shaped composite blocks */}
            <rect x="-24" y="-30" width="20" height="60" fill="#0284c7" stroke="#0369a1" strokeWidth="2" rx="3" />
            <rect x="-4" y="10" width="30" height="20" fill="#f59e0b" stroke="#d97706" strokeWidth="2" rx="3" />
            <circle cx="-14" cy="-20" r="4" fill="#ffffff" />
            <polygon points="16,20 22,25 16,30" fill="#ffffff" />
          </g>

          {/* Middle: Rotation indicator arrow 90 deg clockwise */}
          <g transform="translate(140, 85)">
            <path d="M -15 -18 A 24 24 0 0 1 18 10" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
            <polygon points="23,10 16,18 13,8" fill="#7c3aed" />
            <text x="0" y="32" textAnchor="middle" fill="#6d28d9" fontSize="11" fontWeight="bold">دوران 90° ↷</text>
            <text x="0" y="44" textAnchor="middle" fill="#8b5cf6" fontSize="9">مع عقارب الساعة</text>
          </g>

          {/* Right: Target ? Box */}
          <g transform="translate(215, 85)">
            <rect x="-45" y="-55" width="90" height="110" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 3" rx="8" />
            <text x="0" y="-40" textAnchor="middle" fill="#1d4ed8" fontSize="10" fontWeight="bold">الوضع الناتج؟</text>
            <text x="0" y="12" textAnchor="middle" fill="#2563eb" fontSize="36" fontWeight="bold">؟</text>
            <text x="0" y="40" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="bold">اختر من الخيارات</text>
          </g>
        </svg>
      );

    case 'gears_four_train':
      // 4 meshed gears: 1 (red), 2 (blue), 3 (green), 4 (yellow)
      return (
        <svg width={size} height={size * 0.72} viewBox="0 0 300 160" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          <rect x="0" y="0" width="300" height="160" fill="#f8fafc" rx="12" />
          <text x="150" y="22" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="bold">سلسلة التروس الأربعة (1 ⟶ 2 ⟶ 3 ⟶ 4)</text>

          {/* Gear 1 (Red) */}
          <g transform="translate(42, 85)">
            <circle cx="0" cy="0" r="26" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="8" fill="#b91c1c" />
            {[0, 60, 120, 180, 240, 300].map(a => (
              <rect key={a} x="-4" y="-31" width="8" height="7" fill="#dc2626" transform={`rotate(${a})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">1</text>
            <text x="0" y="-36" textAnchor="middle" fill="#dc2626" fontSize="9" fontWeight="bold">مع العقارب ↷</text>
          </g>

          {/* Gear 2 (Blue) */}
          <g transform="translate(98, 85)">
            <circle cx="0" cy="0" r="26" fill="#dbeafe" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="8" fill="#1d4ed8" />
            {[0, 60, 120, 180, 240, 300].map(a => (
              <rect key={a} x="-4" y="-31" width="8" height="7" fill="#2563eb" transform={`rotate(${a + 30})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">2</text>
          </g>

          {/* Gear 3 (Green) */}
          <g transform="translate(154, 85)">
            <circle cx="0" cy="0" r="26" fill="#dcfce7" stroke="#16a34a" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="8" fill="#15803d" />
            {[0, 60, 120, 180, 240, 300].map(a => (
              <rect key={a} x="-4" y="-31" width="8" height="7" fill="#16a34a" transform={`rotate(${a})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">3</text>
          </g>

          {/* Gear 4 (Yellow/Orange - Target) */}
          <g transform="translate(212, 85)">
            <circle cx="0" cy="0" r="28" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            <circle cx="0" cy="0" r="9" fill="#b45309" />
            {[0, 60, 120, 180, 240, 300].map(a => (
              <rect key={a} x="-4" y="-33" width="8" height="8" fill="#d97706" transform={`rotate(${a + 30})`} rx="1" />
            ))}
            <text x="0" y="4" textAnchor="middle" fill="#78350f" fontSize="13" fontWeight="bold">4</text>
            <text x="0" y="46" textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">الاتجاه؟ (؟)</text>
          </g>
        </svg>
      );

    case 'spatial_cube_fold':
      // Mental rotation unfolding cube diagram
      return (
        <svg width={size} height={size * 0.72} viewBox="0 0 200 150" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          <g fill="#f1f5f9" stroke="#334155" strokeWidth="2">
            {/* Top */}
            <rect x="75" y="15" width="35" height="35" rx="2" />
            <circle cx="92.5" cy="32.5" r="6" fill="#0284c7" />
            
            {/* Left */}
            <rect x="40" y="50" width="35" height="35" rx="2" />
            <polygon points="57.5,58 67,77 48,77" fill="#10b981" />

            {/* Center */}
            <rect x="75" y="50" width="35" height="35" fill="#e2e8f0" rx="2" />
            <rect x="85" y="60" width="15" height="15" fill="#f59e0b" rx="2" />

            {/* Right */}
            <rect x="110" y="50" width="35" height="35" rx="2" />
            <line x1="118" y1="58" x2="137" y2="77" stroke="#dc2626" strokeWidth="3" />
            <line x1="137" y1="58" x2="118" y2="77" stroke="#dc2626" strokeWidth="3" />

            {/* Bottom 1 */}
            <rect x="75" y="85" width="35" height="35" rx="2" />
            <circle cx="92.5" cy="102.5" r="7" fill="#8b5cf6" />

            {/* Bottom 2 */}
            <rect x="75" y="120" width="35" height="25" rx="2" />
            <text x="92.5" y="137" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="bold">★</text>
          </g>
          <text x="165" y="45" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">مخطط مكعب</text>
          <text x="165" y="62" textAnchor="middle" fill="#64748b" fontSize="11">مفرود</text>
        </svg>
      );

    case 'balance_scale_lever':
      // Mechanical lever with fulcrum and weights
      return (
        <svg width={size} height={size * 0.65} viewBox="0 0 240 140" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Lever Bar */}
          <line x1="20" y1="70" x2="220" y2="70" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
          
          {/* Fulcrum at x=100 (closer to left) */}
          <polygon points="100,70 85,115 115,115" fill="#d97706" stroke="#92400e" strokeWidth="2" />
          <rect x="70" y="115" width="60" height="10" fill="#334155" rx="2" />
          
          {/* Marks on beam */}
          <line x1="60" y1="64" x2="60" y2="76" stroke="#fff" strokeWidth="2" />
          <line x1="140" y1="64" x2="140" y2="76" stroke="#fff" strokeWidth="2" />
          <line x1="180" y1="64" x2="180" y2="76" stroke="#fff" strokeWidth="2" />

          {/* Left weight: 20 kg at x=30 (distance 70 from fulcrum) */}
          <rect x="20" y="40" width="26" height="26" fill="#0284c7" rx="4" />
          <text x="33" y="58" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">20كجم</text>

          {/* Right weight: ? at x=200 (distance 100 from fulcrum) */}
          <rect x="185" y="44" width="22" height="22" fill="#ef4444" rx="4" />
          <text x="196" y="60" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">؟</text>

          <text x="120" y="25" textAnchor="middle" fill="#047857" fontSize="12" fontWeight="bold">
            لكي تتزن الرافعة أفقياً، كم يجب أن يكون الوزن (؟)؟
          </text>
        </svg>
      );

    case 'water_vessels_connected':
      // Communicating vessels with liquids
      return (
        <svg width={size} height={size * 0.65} viewBox="0 0 240 140" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Pipe connect at bottom */}
          <rect x="30" y="100" width="180" height="16" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
          
          {/* Vessel 1 (wide) */}
          <path d="M 40 30 L 40 100 L 70 100 L 70 30" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
          <rect x="42" y="55" width="26" height="45" fill="#38bdf8" />
          <text x="55" y="25" textAnchor="middle" fill="#0369a1" fontSize="12" fontWeight="bold">(أ)</text>

          {/* Vessel 2 (narrow) */}
          <path d="M 110 30 L 110 100 L 130 100 L 130 30" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
          <rect x="112" y="55" width="16" height="45" fill="#38bdf8" />
          <text x="120" y="25" textAnchor="middle" fill="#0369a1" fontSize="12" fontWeight="bold">(ب)</text>

          {/* Vessel 3 (slanted/curved) */}
          <path d="M 170 30 L 160 100 L 180 100 L 195 30" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
          <polygon points="175,55 160,100 180,100 190,55" fill="#38bdf8" />
          <text x="185" y="25" textAnchor="middle" fill="#0369a1" fontSize="12" fontWeight="bold">(ج)</text>

          {/* Level dotted line */}
          <line x1="35" y1="55" x2="205" y2="55" stroke="#0369a1" strokeWidth="2" strokeDasharray="3 3" />
          <text x="120" y="130" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="bold">
            خط استواء سطح السائل في الأواني المستطرقة
          </text>
        </svg>
      );

    case 'mirror_reflection':
      // Shape reflected across a mirror line
      return (
        <svg width={size} height={size * 0.65} viewBox="0 0 240 140" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Mirror vertical line */}
          <line x1="120" y1="15" x2="120" y2="125" stroke="#64748b" strokeWidth="3" strokeDasharray="6 3" />
          <text x="120" y="136" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold">خط المرآة</text>

          {/* Original Shape (Left) */}
          <g transform="translate(60, 65)">
            <polygon points="-30,-25 15,-25 30,0 15,25 -30,25" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="2" />
            <circle cx="-10" cy="0" r="8" fill="#1d4ed8" />
            <text x="0" y="38" textAnchor="middle" fill="#1e3a8a" fontSize="11" fontWeight="bold">الشكل الأصلي</text>
          </g>

          {/* Question Box (Right) */}
          <rect x="150" y="35" width="60" height="60" fill="#fef2f2" stroke="#dc2626" strokeWidth="2" strokeDasharray="3 3" rx="8" />
          <text x="180" y="72" textAnchor="middle" fill="#dc2626" fontSize="26" fontWeight="bold">؟</text>
          <text x="180" y="105" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="bold">الصورة في المرآة</text>
        </svg>
      );

    case 'isometric_blocks':
      // 3D block stacking diagram for counting
      return (
        <svg width={size} height={size * 0.72} viewBox="0 0 200 160" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Background grid */}
          <rect x="5" y="5" width="190" height="150" fill="#f8fafc" rx="8" />
          
          {/* Block 1 (bottom left) */}
          <g transform="translate(50, 100)">
            <polygon points="0,0 20,-10 40,0 20,10" fill="#93c5fd" stroke="#1e40af" strokeWidth="1.5" />
            <polygon points="0,0 20,10 20,30 0,20" fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5" />
            <polygon points="20,10 40,0 40,20 20,30" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5" />
          </g>

          {/* Block 2 (bottom center) */}
          <g transform="translate(80, 115)">
            <polygon points="0,0 20,-10 40,0 20,10" fill="#93c5fd" stroke="#1e40af" strokeWidth="1.5" />
            <polygon points="0,0 20,10 20,30 0,20" fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5" />
            <polygon points="20,10 40,0 40,20 20,30" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5" />
          </g>

          {/* Block 3 (bottom right) */}
          <g transform="translate(110, 100)">
            <polygon points="0,0 20,-10 40,0 20,10" fill="#93c5fd" stroke="#1e40af" strokeWidth="1.5" />
            <polygon points="0,0 20,10 20,30 0,20" fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5" />
            <polygon points="20,10 40,0 40,20 20,30" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5" />
          </g>

          {/* Block 4 (middle tier, stacked on block 1) */}
          <g transform="translate(50, 80)">
            <polygon points="0,0 20,-10 40,0 20,10" fill="#a7f3d0" stroke="#047857" strokeWidth="1.5" />
            <polygon points="0,0 20,10 20,30 0,20" fill="#34d399" stroke="#047857" strokeWidth="1.5" />
            <polygon points="20,10 40,0 40,20 20,30" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
          </g>

          {/* Block 5 (top tier, stacked on block 4) */}
          <g transform="translate(50, 60)">
            <polygon points="0,0 20,-10 40,0 20,10" fill="#fde68a" stroke="#b45309" strokeWidth="1.5" />
            <polygon points="0,0 20,10 20,30 0,20" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
            <polygon points="20,10 40,0 40,20 20,30" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          </g>

          {/* Block 6 (back right) */}
          <g transform="translate(80, 75)">
            <polygon points="0,0 20,-10 40,0 20,10" fill="#fbcfe8" stroke="#be185d" strokeWidth="1.5" />
            <polygon points="0,0 20,10 20,30 0,20" fill="#f472b6" stroke="#be185d" strokeWidth="1.5" />
            <polygon points="20,10 40,0 40,20 20,30" fill="#ec4899" stroke="#be185d" strokeWidth="1.5" />
          </g>

          <text x="100" y="25" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="bold">
            كم عدد المكعبات المتطابقة في هذا المجسم؟
          </text>
        </svg>
      );

    case 'analog_clock_angle':
      // Clock at 3:00 showing 90 degree angle
      return (
        <svg width={size} height={size * 0.75} viewBox="0 0 180 150" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Clock face */}
          <circle cx="90" cy="75" r="55" fill="#f8fafc" stroke="#334155" strokeWidth="4" />
          <circle cx="90" cy="75" r="4" fill="#0284c7" />

          {/* Numbers / ticks */}
          <text x="90" y="35" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">12</text>
          <text x="135" y="79" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">3</text>
          <text x="90" y="122" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">6</text>
          <text x="45" y="79" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold">9</text>

          {/* Minute Hand pointing at 12 */}
          <line x1="90" y1="75" x2="90" y2="40" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
          
          {/* Hour Hand pointing at 3 */}
          <line x1="90" y1="75" x2="120" y2="75" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />

          {/* Arc between hands */}
          <path d="M 90 60 A 15 15 0 0 1 105 75" fill="none" stroke="#0284c7" strokeWidth="2" />
          <text x="105" y="65" fill="#0284c7" fontSize="11" fontWeight="bold">؟°</text>
        </svg>
      );

    case 'pattern_sequence_shapes':
      // Sequence: Circle -> Triangle -> Square -> Pentagon -> (?)
      return (
        <svg width={size} height={size * 0.55} viewBox="0 0 240 100" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Circle (1) */}
          <g transform="translate(30, 45)">
            <circle cx="0" cy="0" r="15" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" />
            <text x="0" y="32" textAnchor="middle" fill="#64748b" fontSize="10">3 أضلاع؟ لا</text>
          </g>

          {/* Triangle (3 sides) */}
          <g transform="translate(80, 45)">
            <polygon points="0,-16 15,14 -15,14" fill="#dcfce7" stroke="#15803d" strokeWidth="2" />
            <text x="0" y="32" textAnchor="middle" fill="#64748b" fontSize="10">3 أضلاع</text>
          </g>

          {/* Square (4 sides) */}
          <g transform="translate(130, 45)">
            <rect x="-14" y="-14" width="28" height="28" fill="#fef3c7" stroke="#b45309" strokeWidth="2" rx="2" />
            <text x="0" y="32" textAnchor="middle" fill="#64748b" fontSize="10">4 أضلاع</text>
          </g>

          {/* Pentagon (5 sides) */}
          <g transform="translate(180, 45)">
            <polygon points="0,-16 15,-4 10,14 -10,14 -15,-4" fill="#f3e8ff" stroke="#7e22ce" strokeWidth="2" />
            <text x="0" y="32" textAnchor="middle" fill="#64748b" fontSize="10">5 أضلاع</text>
          </g>

          {/* Question (6 sides) */}
          <g transform="translate(222, 45)">
            <text x="0" y="8" textAnchor="middle" fill="#dc2626" fontSize="22" fontWeight="bold">؟</text>
          </g>
        </svg>
      );

    case 'venn_diagram_sets':
      // Two overlapping Venn circles
      return (
        <svg width={size} height={size * 0.65} viewBox="0 0 200 130" className={`border border-slate-300 dark:border-slate-700 rounded-2xl bg-white shadow-xs ${className}`}>
          {/* Circle A (Left) */}
          <circle cx="75" cy="65" r="45" fill="#93c5fd" fillOpacity="0.4" stroke="#2563eb" strokeWidth="2" />
          <text x="50" y="68" textAnchor="middle" fill="#1e3a8a" fontSize="11" fontWeight="bold">مضرب</text>
          <text x="50" y="30" textAnchor="middle" fill="#1e3a8a" fontSize="11" fontWeight="bold">كرة التنس (14)</text>

          {/* Circle B (Right) */}
          <circle cx="125" cy="65" r="45" fill="#86efac" fillOpacity="0.4" stroke="#16a34a" strokeWidth="2" />
          <text x="150" y="68" textAnchor="middle" fill="#14532d" fontSize="11" fontWeight="bold">شباك</text>
          <text x="150" y="30" textAnchor="middle" fill="#14532d" fontSize="11" fontWeight="bold">كرة الطائرة (18)</text>

          {/* Intersection */}
          <text x="100" y="68" textAnchor="middle" fill="#b91c1c" fontSize="14" fontWeight="black">6</text>
          <text x="100" y="120" textAnchor="middle" fill="#475569" fontSize="10">يمارسون اللعبتين معاً</text>
        </svg>
      );

    // OPTION CHOICES
    case 'opt_3_triangles':
      return (
        <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto">
          <polygon points="30,40 40,65 20,65" fill="#f59e0b" />
          <polygon points="52,40 62,65 42,65" fill="#f59e0b" />
          <polygon points="74,40 84,65 64,65" fill="#f59e0b" />
        </svg>
      );

    case 'opt_2_circles':
      return (
        <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto">
          <circle cx="35" cy="50" r="14" fill="#0284c7" />
          <circle cx="65" cy="50" r="14" fill="#0284c7" />
        </svg>
      );

    case 'opt_clockwise':
      return (
        <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto">
          <circle cx="50" cy="50" r="28" fill="none" stroke="#0284c7" strokeWidth="4" />
          <polygon points="50,14 66,26 50,38" fill="#0284c7" />
          <text x="50" y="86" textAnchor="middle" fill="#0369a1" fontSize="12" fontWeight="bold">مع عقارب الساعة ↷</text>
        </svg>
      );

    case 'opt_counter_clockwise':
      return (
        <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto">
          <circle cx="50" cy="50" r="28" fill="none" stroke="#d97706" strokeWidth="4" />
          <polygon points="50,14 34,26 50,38" fill="#d97706" />
          <text x="50" y="86" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="bold">عكس عقارب الساعة ↶</text>
        </svg>
      );

    case 'opt_cube_correct':
      return (
        <svg width="65" height="65" viewBox="0 0 100 100" className="mx-auto">
          <polygon points="50,15 80,32 50,48 20,32" fill="#dbeafe" stroke="#1e40af" strokeWidth="2" />
          <circle cx="50" cy="32" r="5" fill="#0284c7" />
          
          <polygon points="20,32 50,48 50,85 20,68" fill="#f8fafc" stroke="#1e40af" strokeWidth="2" />
          <text x="35" y="65" textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="bold">★</text>

          <polygon points="50,48 80,32 80,68 50,85" fill="#e2e8f0" stroke="#1e40af" strokeWidth="2" />
          <rect x="60" y="52" width="10" height="10" fill="#f59e0b" />
        </svg>
      );

    case 'opt_hexagon_correct':
      return (
        <svg width="60" height="60" viewBox="0 0 100 100" className="mx-auto">
          <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#f3e8ff" stroke="#7e22ce" strokeWidth="3" />
          <text x="50" y="55" textAnchor="middle" fill="#581c87" fontSize="14" fontWeight="bold">سداسي</text>
        </svg>
      );

    default:
      return null;
  }
};
