import React, { useState, useEffect, useRef } from 'react';

const Input = ({
  label = '',
  name = '',
  type = 'text',
  onChange = (_event) => {},
  value = '',
  error = '',
  valid = false,
  invalid = false,
  onBlur = undefined,
  autoFocus = false,
  wrapperClassName = '',
  inputClassName = '',
  labelClassName = '',
  disableFloating = false,
  placeholder = '',
  ...rest
}) => {
  const [hasFocus, setFocus] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const defaultWrapperClasses = 'relative z-0 w-full mb-8 text-left';

  const resolveBorderColor = () => {
    if (error || invalid) return 'border-red-500';
    if (valid) return 'border-green-500';
    // Resting underline must meet WCAG 1.4.11 (3:1 non-text contrast) since
    // it's the only boundary identifying the field. gray-300 (~1.47:1) failed;
    // gray-500 is ~4.8:1 on white, slate-500 ~3.9:1 on the dark surface.
    return 'border-gray-500 dark:border-slate-500';
  };

  const resolveFocusBorderColor = () => {
    if (error || invalid) return 'focus:border-red-500';
    if (valid) return 'focus:border-green-500';
    // Brand-primary underline on focus is the visible focus indicator
    // (WCAG 2.4.7) now that the ring/box is gone — a clear colour shift
    // from the resting gray underline, in both light and dark mode.
    return 'focus:border-primary dark:focus:border-primary';
  };

  const defaultInputClasses = [
    'pt-3 pb-2 block w-full mt-0 bg-transparent border-0 border-b-2 appearance-none',
    // Underline-only focus — no ring/box. The brand-primary bottom border on
    // focus (resolveFocusBorderColor) is the visible focus indicator
    // (WCAG 2.4.7). `focus:ring-0` zeroes the @tailwindcss/forms base focus
    // ring (a 1px blue ring it adds to every input via --tw-ring-shadow —
    // shadow-none won't touch it); `focus:outline-none` suppresses the
    // browser default outline.
    'focus:outline-none focus:ring-0',
    resolveBorderColor(),
    resolveFocusBorderColor(),
    'px-5 text-left text-dark-gray dark:text-white',
    'placeholder:text-gray-400 dark:placeholder:text-slate-400'
  ].join(' ');

  const computedWrapperClass = wrapperClassName || defaultWrapperClasses;
  const computedInputClass = inputClassName || defaultInputClasses;
  const shouldShowPlaceholder = disableFloating || !label;
  const resolvedPlaceholder =
    shouldShowPlaceholder && placeholder !== undefined ? placeholder : '';

  return (
    <div className={computedWrapperClass}>
      <input
        id={name}
        type={type}
        placeholder={resolvedPlaceholder}
        onChange={onChange}
        value={value}
        name={name}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={error && name ? `${name}-error` : undefined}
        onFocus={() => setFocus(true)}
        onBlur={(e) => {
          setFocus(false);
          if (onBlur) onBlur(e);
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        className={computedInputClass}
        ref={inputRef}
        {...rest}
      />
      {error && (
        <p id={name ? `${name}-error` : undefined} className="text-red-600">
          {error}
        </p>
      )}
      {label && !disableFloating && (
        <label
          htmlFor={name}
          className={`${
            labelClassName ||
            'absolute duration-300 top-3 -z-1 origin-0 text-gray-500 dark:text-slate-300 pointer-events-none'
          } ${hasFocus || value ? 'scale-75 -translate-y-6' : ''}`}
        >
          {label}
        </label>
      )}
      {label && disableFloating && (
        <label
          htmlFor={name}
          className={
            labelClassName ||
            'block text-sm font-medium text-gray-600 dark:text-slate-200 mt-2'
          }
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Input;
