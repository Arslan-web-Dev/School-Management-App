import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Database, Shield } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="School-wide configuration." />

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard icon={School} title="School profile" body="Multi-school support, logo upload, and academic-year management are coming in a future update. The current build is a single-school setup." />
        <InfoCard icon={Database} title="Backend" body="Powered by Lovable Cloud. Your data is stored in a managed Postgres database with row-level security enforced on every table." />
        <InfoCard icon={Shield} title="Roles & access" body="Roles (admin / teacher / student) are stored in a dedicated table and never on profiles. Permissions are enforced server-side through RLS policies." />
      </div>
    </div>
  );
};

const InfoCard = ({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) => (
  <Card>
    <CardHeader>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-1">{body}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent />
  </Card>
);

export default Settings;
