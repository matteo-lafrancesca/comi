import React from 'react';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Bouton standard de l'app. Pour un lien, utiliser `buttonStyles()` sur un `<Link>`. */
export default function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
