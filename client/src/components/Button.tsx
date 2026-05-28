import { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'outline',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'ink-button',
    `ink-button--${variant}`,
    `ink-button--${size}`,
    disabled ? 'ink-button--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled} {...props}>
      <span className="ink-button__text">{children}</span>
    </button>
  );
}
