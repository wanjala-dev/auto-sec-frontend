import React from 'react';
import PropTypes from 'prop-types';
import { useDraggable } from '@dnd-kit/core';
import { FiMove } from 'react-icons/fi';
import { CHAMFER } from './v2Constants';

const DraggablePanel = ({ id, children, className = '', offset }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const ox = (offset?.x || 0) + (transform?.x || 0);
  const oy = (offset?.y || 0) + (transform?.y || 0);

  const combinedStyle = {
    transform: ox || oy ? `translate(${ox}px, ${oy}px)` : undefined,
    zIndex: isDragging ? 50 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      data-panel-id={id}
      className={`${className} ${isDragging ? 'opacity-80' : ''}`}
      style={combinedStyle}
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute top-1.5 z-30 cursor-grab active:cursor-grabbing p-1 text-gray-700 hover:text-cyan-400 transition"
        style={{ right: CHAMFER + 4 }}
        title="Drag to move"
      >
        <FiMove size={9} />
      </div>
      {children}
    </div>
  );
};

DraggablePanel.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  offset: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number })
};

export default DraggablePanel;
