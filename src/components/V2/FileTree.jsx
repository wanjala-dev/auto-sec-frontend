import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FiFolder,
  FiFileText,
  FiGrid,
  FiPlus,
  FiChevronRight,
  FiChevronDown
} from 'react-icons/fi';

const FileIcon = ({ type }) => {
  if (type === 'pdf')
    return <FiFileText size={11} className="text-red-400/70 flex-shrink-0" />;
  if (type === 'spreadsheet')
    return <FiGrid size={11} className="text-green-400/70 flex-shrink-0" />;
  if (type === 'doc')
    return <FiFileText size={11} className="text-cyan-400/70 flex-shrink-0" />;
  return <FiFileText size={11} className="text-gray-500 flex-shrink-0" />;
};

const FileTreeNode = ({ node, depth = 0, onFileClick }) => {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === 'folder';
  const pl = depth * 16;

  if (isFolder) {
    return (
      <React.Fragment>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1.5 py-[1px] leading-tight hover:bg-cyan-500/[0.04] transition text-left"
          style={{ paddingLeft: pl }}
        >
          {open ? (
            <FiChevronDown
              size={10}
              className="text-cyan-500/50 flex-shrink-0"
            />
          ) : (
            <FiChevronRight
              size={10}
              className="text-cyan-500/40 flex-shrink-0"
            />
          )}
          <FiFolder
            size={11}
            className={`flex-shrink-0 ${
              open ? 'text-cyan-400/60' : 'text-cyan-500/40'
            }`}
          />
          <span
            className={`text-[11px] font-mono leading-tight ${
              open ? 'text-cyan-500/70' : 'text-cyan-500/40'
            }`}
          >
            /{node.name}
          </span>
        </button>
        {open && (
          <React.Fragment>
            {node.children.map((child, i) => (
              <FileTreeNode
                key={child.name + i}
                node={child}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ))}
            <button
              type="button"
              className="w-full flex items-center gap-1.5 py-[1px] leading-tight hover:bg-cyan-500/[0.04] transition text-left"
              style={{ paddingLeft: pl + 16 }}
            >
              <FiPlus size={9} className="text-cyan-500/25 flex-shrink-0" />
              <span className="text-[9px] font-mono text-cyan-500/25 italic">
                add
              </span>
            </button>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  const fileColor =
    node.type === 'pdf'
      ? 'text-red-400/70 hover:text-red-300'
      : node.type === 'spreadsheet'
      ? 'text-green-400/70 hover:text-green-300'
      : 'text-cyan-400/70 hover:text-cyan-300';

  return (
    <button
      type="button"
      onClick={() => onFileClick?.(node)}
      className={`w-full flex items-center gap-1.5 py-[1px] leading-tight hover:bg-cyan-500/[0.04] transition text-left ${fileColor}`}
      style={{ paddingLeft: pl }}
    >
      <FileIcon type={node.type} />
      <span className="text-[11px] font-mono leading-tight truncate">
        {node.name}
      </span>
    </button>
  );
};

const FileTree = ({ data, onFileClick, className = '' }) => (
  <div className={`max-h-[32vh] overflow-y-auto cc-scrollbar ${className}`}>
    {data.map((node, i) => (
      <FileTreeNode
        key={node.name + i}
        node={node}
        depth={0}
        onFileClick={onFileClick}
      />
    ))}
  </div>
);

FileTree.propTypes = {
  data: PropTypes.array.isRequired,
  onFileClick: PropTypes.func,
  className: PropTypes.string
};

export default FileTree;
