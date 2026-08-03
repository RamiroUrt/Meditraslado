import type { InputProps } from "@/types/ui";

export default function Input({ className = "", ...rest }: InputProps) {
  return <input className={`form-input ${className}`.trim()} {...rest} />;
}
