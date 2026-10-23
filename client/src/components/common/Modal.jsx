import { X } from 'lucide-react';
export default function Modal({ title, onClose, children }) {
  return (<div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h3>{title}</h3><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>{children}
    </div></div>);
}
