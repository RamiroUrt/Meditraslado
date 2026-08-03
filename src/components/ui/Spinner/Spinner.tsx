import type { SpinnerProps } from "@/types/ui";

export default function Spinner({ size = 16 }: SpinnerProps) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}
