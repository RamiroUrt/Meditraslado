import type { TextareaProps } from "@/types/ui";

export default function Textarea({ className = "", ...rest }: TextareaProps) {
  return <textarea className={`form-input form-textarea ${className}`.trim()} {...rest} />;
}
