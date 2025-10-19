import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TableActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  viewButtonText?: string;
  extraActions?: Array<{ label: string; onClick: () => void }>;
}

const TableActionMenu: React.FC<TableActionMenuProps> = ({ onEdit, onDelete, onView, viewButtonText = 'View', extraActions = [] }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Calculate position when dropdown opens
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 180 + window.scrollX // Align right edge of dropdown with right edge of button
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1 focus:outline-none"
        title="More actions"
        style={{ background: 'none', border: 'none', boxShadow: 'none', minWidth: '24px' }}
      >
        <span style={{ fontSize: '18px', lineHeight: '1', letterSpacing: '2px', verticalAlign: 'middle' }}>︙</span>
      </button>
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg min-w-[150px] w-[180px] flex flex-col text-left animate-fadeinup"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          {onView && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onView(); }}
              className="px-4 py-2 hover:bg-gray-200 text-black w-full text-left"
            >
              {viewButtonText}
            </button>
          )}
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="px-4 py-2 hover:bg-gray-200 text-black w-full text-left"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="px-4 py-2 hover:bg-gray-200 text-red-600 w-full text-left"
            >
              Delete
            </button>
          )}
          {extraActions.map((action, idx) => (
            <button
              key={idx}
              onClick={e => { e.stopPropagation(); setOpen(false); action.onClick(); }}
              className="px-4 py-2 hover:bg-gray-200 text-black w-full text-left"
            >
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default TableActionMenu; 