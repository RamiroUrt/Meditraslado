import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "@/components/ui/Spinner";

type ButtonVariant = "primary" | "secondary" | "whatsapp" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  className = "",
  icon,
  loading,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`btn btn--${variant} ${className}`.trim()} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
}
