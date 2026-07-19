import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './modal.css';

const PopOver = ({
  show,
  setShow,
  hideCloseButton = false,
  size = 'default',
  contentClassName = '',
  // Optional override for the overlay z-index. Default (from modal.css)
  // is 9999 — fine for a single modal. Pass a higher number for a
  // modal that opens inside another modal so it doesn't get stuck at
  // the same stacking level and paint behind its parent.
  zIndex = undefined,
  // Optional stable hook for tests / automation to find + dismiss this modal.
  testId = undefined,
  children
}) => {
  const modalRef = useRef(null);

  const modalRoot =
    typeof document !== 'undefined' && document.body ? document.body : null;

  const resolvedContentClassName = [
    'modal__content',
    size && size !== 'default' ? `modal__content--${size}` : '',
    // Reserve top-right space at the component level so the close (×)
    // button never overlaps a consumer's content. Forms shouldn't have to
    // remember to add their own top padding for the X.
    !hideCloseButton ? 'modal__content--with-close' : '',
    contentClassName
  ]
    .filter(Boolean)
    .join(' ');

  const handleOverlayMouseDown = (event) => {
    if (modalRef.current && event.target === modalRef.current) {
      setShow(false);
    }
  };

  useEffect(() => {
    if (!modalRoot) return undefined;
    if (show) {
      modalRoot.style.overflow = 'hidden';
    } else {
      modalRoot.style.overflow = '';
    }
    return () => {
      modalRoot.style.overflow = '';
    };
  }, [show, modalRoot]);

  // Escape closes the modal — standard dialog behaviour. Without this the only
  // ways out are the × button and a backdrop click, which leaves the overlay
  // (pointer-events: auto while open) intercepting clicks if those are missed.
  useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShow(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show, setShow]);

  if (!modalRoot) {
    return null;
  }

  const overlayStyle =
    zIndex !== undefined && zIndex !== null ? { zIndex } : undefined;

  return createPortal(
    <div
      ref={modalRef}
      className={`modal ${show ? 'active' : ''}`}
      style={overlayStyle}
      onMouseDown={handleOverlayMouseDown}
      data-testid={testId}
      data-modal-open={show ? 'true' : 'false'}
    >
      <div className={resolvedContentClassName}>
        {!hideCloseButton && (
          <span onClick={() => setShow(false)} className="modal__close">
            &times;
          </span>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default PopOver;

export const ModalHeader = (props) => {
  return <div className="modal__header">{props.children}</div>;
};

export const ModalBody = (props) => {
  return <div className="modal__body">{props.children}</div>;
};

export const ModalFooter = (props) => {
  return <div className="modal__footer">{props.children}</div>;
};
