import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Input({ className = "", ...rest }: InputProps) {
  return <input className={`form-input ${className}`.trim()} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select className={`form-input ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...rest }: TextareaProps) {
  return <textarea className={`form-input form-textarea ${className}`.trim()} {...rest} />;
}
