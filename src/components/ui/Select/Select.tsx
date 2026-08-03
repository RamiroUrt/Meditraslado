import type { SelectProps } from "@/types/ui";

export default function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select className={`form-input ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}
