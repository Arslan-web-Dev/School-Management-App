import { Inbox, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }: Props) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="font-semibold">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
