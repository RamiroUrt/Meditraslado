import type { CheckboxProps } from "@/types/ui";

export default function Checkbox({ label, className = "", id, ...rest }: CheckboxProps) {
  return (
    <label className={`checkbox ${className}`.trim()} htmlFor={id}>
      <input type="checkbox" id={id} {...rest} />
      <span>{label}</span>
    </label>
  );
}
