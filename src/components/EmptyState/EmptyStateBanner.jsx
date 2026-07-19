import React from 'react';
import PropTypes from 'prop-types';
import Button from '../Button/Button';

const EmptyStateBanner = ({
  title,
  description,
  action,
  children,
  className = ''
}) => {
  const hasAction =
    action &&
    typeof action.label === 'string' &&
    typeof action.onClick === 'function';

  return (
    <div
      className={`bg-white dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-10 text-center ${className}`.trim()}
    >
      {children}
      {title && (
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {description}
        </p>
      )}
      {hasAction && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            pill={action.pill ?? true}
            variant={action.variant || 'primary'}
            size={action.size || 'normal'}
            onClick={action.onClick}
            isLoading={action.isLoading}
            loadingText={action.loadingText}
            disabled={action.disabled}
            className={action.className}
            icon={action.icon}
          >
            <span className="uppercase">{action.label}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

EmptyStateBanner.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    variant: PropTypes.string,
    size: PropTypes.string,
    pill: PropTypes.bool,
    isLoading: PropTypes.bool,
    loadingText: PropTypes.string,
    disabled: PropTypes.bool,
    className: PropTypes.string,
    icon: PropTypes.node
  }),
  children: PropTypes.node,
  className: PropTypes.string
};

export default EmptyStateBanner;
