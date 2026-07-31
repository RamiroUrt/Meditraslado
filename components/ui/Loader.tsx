import Spinner from "@/components/ui/Spinner";

interface LoaderProps {
  label?: string;
}

export default function Loader({ label = "Cargando..." }: LoaderProps) {
  return (
    <div className="loader">
      <Spinner size={28} />
      <span className="loader-label">{label}</span>
    </div>
  );
}
