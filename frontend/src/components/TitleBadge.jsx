// src/components/TitleBadge.jsx
// Component hiển thị danh hiệu người dùng

import { useAuth } from '../context/AuthContext';

export default function TitleBadge({ title, size = 'sm' }) {
  const { TITLE_NAMES } = useAuth();
  const info = TITLE_NAMES[title] || TITLE_NAMES['TAN_TINH'];

  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span className={`badge title-badge title-${title} ${sizeClass}`}>
      <span>{info.emoji}</span>
      <span>{info.name}</span>
    </span>
  );
}
