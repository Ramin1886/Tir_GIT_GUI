import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  const menuWidth = 180;
  const menuHeight = items.length * 32 + 10;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  let left = x;
  let top = y;

  if (x + menuWidth > screenWidth) {
    left = screenWidth - menuWidth - 10;
  }
  if (y + menuHeight > screenHeight) {
    top = screenHeight - menuHeight - 10;
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 10000,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`context-menu__item ${item.danger ? 'context-menu__item--danger' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
