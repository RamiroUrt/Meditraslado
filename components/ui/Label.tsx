import type { LabelHTMLAttributes } from "react";

export default function Label({ className = "", children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`form-label label ${className}`.trim()} {...rest}>
      {children}
    </label>
  );
}
