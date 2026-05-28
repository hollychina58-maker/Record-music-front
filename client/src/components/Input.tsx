import { InputHTMLAttributes, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const inputClasses = [
      'ink-input__field',
      error ? 'ink-input__field--error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="ink-input">
        {label && <label className="ink-input__label">{label}</label>}
        <input ref={ref} className={inputClasses} {...props} />
        <div className={`ink-input__underline ${error ? 'ink-input__underline--error' : ''}`} />
        {error && <span className="ink-input__error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
