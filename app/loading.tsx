import { EliteLoader } from "@/components/ui/EliteLoader";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <EliteLoader size={48} />
      <p className="text-white/40 text-sm">Cargando...</p>
    </div>
  );
}
