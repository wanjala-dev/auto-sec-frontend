import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { cls } from '../../shared/ui/classNames';

const classes = {
  base: 'focus:outline-none transition ease-in-out duration-300 flex items-center justify-center',
  disabled:
    'opacity-50 bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300',
  pill: 'rounded-full border',

  size: {
    small: 'p-1 text-xs',
    normal: 'px-4 py-2 text-sm',
    large: 'px-8 py-3 text-lg',
    icon: 'h-9 w-9 p-0 text-sm'
  },
  variant: {
    primary:
      // Resolved brand action colour. `--primary` + `--primary-foreground` are
      // derived per workspace by the backend BrandResolutionService, which
      // guarantees WCAG AA on the pair — so this themes AND stays legible for
      // any brand (the old hardcoded teal→amber gradient did neither).
      'bg-primary text-primary-foreground uppercase transition-all duration-700 ease-in-out hover:scale-110',
    secondary:
      'bg-white border border-solid uppercase border-gray-300 text-gray-700 transition-all duration-700 ease-in-out hover:scale-110 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200',
    danger:
      'bg-red-500 from-indigo-500 to-pink-500 hover:bg-red-300 text-white transition-all duration-700 ease-in-out hover:scale-110',
    outline:
      'text-slate-700 bg-transparent border-2 border-solid border-slate-300 font-bold uppercase rounded-full outline-none focus:outline-none transition-all duration-700 ease-in-out hover:scale-110 hover:border-slate-400 dark:text-slate-200 dark:border-slate-500 dark:hover:border-slate-400',
    // Borderless text-only affordance (e.g. the Kanban "add task" trigger).
    // Use this instead of outline + a border-0 override — border-2 wins the
    // stylesheet-order fight, so that override never actually worked.
    ghost:
      'text-slate-600 bg-transparent font-bold uppercase outline-none focus:outline-none transition-all duration-700 ease-in-out hover:scale-110 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
    register:
      'bg-gray-200 text-gray-400 w-60 h-11 opacity-50 cursor-not-allowed transition-all duration-700 ease-in-out hover:scale-110',
    success:
      'bg-green-700 text-white w-60 h-11 hover:bg-green-600 transition-all duration-700 ease-in-out hover:scale-110',
    disallowed:
      'text-white w-60 h-11 bg-green-600 transition-all duration-700 ease-in-out hover:scale-110',
    isLoading:
      'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400 transition-all duration-700 ease-in-out hover:scale-110',
    scroll:
      'bg-white text-gray-500 border border-gray-200 rounded-full shadow transition-all duration-300 ease-in-out hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800'
  }
};

const Button = forwardRef(
  (
    {
      children,
      type = 'button',
      className,
      variant = 'primary',
      size = 'normal',
      isLoading: isLoadingProp = false,
      loading, // alias for isLoading — many consumers pass `loading`
      loadingText,
      pill = true,
      onClick,
      disabled = false,
      icon, // Add the icon prop
      ...props
    },
    ref
  ) => {
    const isLoading = isLoadingProp || Boolean(loading);
    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        type={type}
        className={cls(`
                ${classes.base}
                ${classes.size[size]}
                ${(disabled || isLoading) && classes.disabled}
                ${classes.variant[variant]}
                ${pill && (variant === 'ghost' ? 'rounded-full' : classes.pill)}
                ${disabled && classes.disabled}
                ${className}
            `)}
        {...props}
      >
        {icon && <span className="flex-shrink-0 mr-2">{icon}</span>}
        {!isLoading && <span>{children}</span>}
        {isLoading && (
          <span className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-6 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-80"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              />
            </svg>
            {loadingText && loadingText}
          </span>
        )}
      </button>
    );
  }
);

Button.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['submit', 'button']),
  className: PropTypes.string,
  pill: PropTypes.bool,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'danger',
    'outline',
    'ghost',
    'register',
    'success',
    'disallowed',
    'isLoading',
    'scroll'
  ]),
  size: PropTypes.oneOf(['small', 'normal', 'large', 'icon']),
  icon: PropTypes.node, // Add the icon prop type
  isLoading: PropTypes.bool,
  loading: PropTypes.bool,
  loadingText: PropTypes.string
};

Button.displayName = 'Button';
export default Button;
