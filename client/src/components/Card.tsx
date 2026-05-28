import { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  content?: string;
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated';
}

export function Card({ title, content, children, className = '', variant = 'default' }: CardProps) {
  const classes = ['ink-card', `ink-card--${variant}`, className].filter(Boolean).join(' ');

  return (
    <article className={classes}>
      {title && <h3 className="ink-card__title">{title}</h3>}
      {content && <p className="ink-card__content">{content}</p>}
      {children && <div className="ink-card__body">{children}</div>}
    </article>
  );
}
