// src/components/ExpBar.jsx
// Thanh tiến trình EXP dạng cột năng lượng Segmented Core

import { TITLE_NAMES } from '../context/AuthContext';

// Mốc EXP cho từng cấp (giống backend seed)
const EXP_THRESHOLDS = [
  { title: 'TAN_TINH',    min: 0,    max: 200   },
  { title: 'BACH_LOC',    min: 200,  max: 600   },
  { title: 'THUONG_LANG', min: 600,  max: 1500  },
  { title: 'KIM_O',       min: 1500, max: 3000  },
  { title: 'XICH_HO',     min: 3000, max: 5500  },
  { title: 'TU_HIEU',     min: 5500, max: 9000  },
  { title: 'CHU_PHUONG',  min: 9000, max: 14000 },
  { title: 'NGAN_LONG',   min: 14000, max: 20000 },
  { title: 'SANG_THE',    min: 20000, max: Infinity },
];

export default function ExpBar({ totalExp, title, compact = false }) {
  const segmentCount = 10;

  if (title === 'ADMIN') {
    return (
      <div className="exp-bar-wrapper font-label-mono">
        <div className="exp-bar-labels mb-1">
          <span className="text-secondary font-bold text-xs">
            👑 ADMIN OVERRIDE — REACTOR OVERCLOCK
          </span>
        </div>
        <div className="w-full h-6 bg-black border-2 border-black flex gap-1 p-0.5">
          {Array.from({ length: segmentCount }).map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-full bg-secondary shadow-[0_0_8px_#dab9ff] animate-pulse"
              style={{ animationDelay: `${idx * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const level = EXP_THRESHOLDS.find(t => t.title === title) || EXP_THRESHOLDS[0];
  const nextLevel = EXP_THRESHOLDS[EXP_THRESHOLDS.indexOf(level) + 1];

  const isMax = level.title === 'SANG_THE';
  const progress = isMax ? 100 : Math.min(
    ((totalExp - level.min) / (level.max - level.min)) * 100,
    100
  );

  const titleInfo = TITLE_NAMES[title] || TITLE_NAMES['TAN_TINH'];
  const nextInfo = nextLevel ? TITLE_NAMES[nextLevel.title] : null;

  // Tính số lượng segment được kích hoạt
  const activeSegments = Math.round((progress / 100) * segmentCount);

  return (
    <div className="exp-bar-wrapper font-label-mono">
      <div className="exp-bar-labels mb-1 flex justify-between text-[11px]">
        <span className="text-on-surface-variant">
          {!compact && `${titleInfo.emoji} `}
          <strong className="text-tertiary">{totalExp} EXP</strong>
        </span>
        {!isMax && nextInfo && (
          <span className="text-outline">
            → {nextInfo.emoji} {nextInfo.name} ({level.max} EXP)
          </span>
        )}
        {isMax && <span className="text-secondary font-bold">✨ SOURCE GATE ACTIVATED</span>}
      </div>

      {/* Segmented Progress Track */}
      <div className="w-full h-6 bg-black border-2 border-black flex gap-0.5 p-0.5">
        {Array.from({ length: segmentCount }).map((_, idx) => {
          const isActive = idx < activeSegments;
          return (
            <div
              key={idx}
              className={`flex-1 h-full transition-all duration-300 ${
                isActive 
                  ? 'bg-tertiary shadow-[0_0_8px_rgba(23,222,202,0.8)]' 
                  : 'bg-surface-container-highest opacity-20'
              }`}
            />
          );
        })}
      </div>

      {!compact && (
        <div className="text-[10px] text-outline text-right mt-1">
          {isMax ? 'CORE SYNC: 100%' : `CORE SYNC: ${Math.round(progress)}%`}
        </div>
      )}
    </div>
  );
}
