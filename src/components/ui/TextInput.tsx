import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Libellé affiché au-dessus du champ (petites capitales). */
  label?: string;
}

/** Champ texte « sur la ligne » : seule la bordure basse est tracée. */
export default function TextInput({ label, className = '', id, ...props }: TextInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="eyebrow block mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full py-2.5 text-base bg-transparent border-b border-neutral-300 dark:border-neutral-700 outline-none transition-colors focus:border-text-light-main dark:focus:border-text-dark-main placeholder:text-text-light-muted/70 dark:placeholder:text-text-dark-muted/70 disabled:opacity-50 ${className}`}
        {...props}
      />
    </div>
  );
}
