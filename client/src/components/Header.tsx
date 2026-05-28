import { ReactNode } from 'react';
import './Header.css';

interface HeaderProps {
  title?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function Header({ title, leftContent, rightContent }: HeaderProps) {
  return (
    <header className="ink-header">
      <div className="ink-header__left">{leftContent}</div>
      <div className="ink-header__center">
        {title && <h1 className="ink-header__title">{title}</h1>}
      </div>
      <div className="ink-header__right">{rightContent}</div>
      <div className="ink-header__divider" />
    </header>
  );
}
