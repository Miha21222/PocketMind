import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className="center-state loading-state">
      <div className="loading-icon-wrap">
        <Loader2 className="loading-icon-spin" size={34} />
      </div>
      <p>{label}</p>
    </div>
  );
}
