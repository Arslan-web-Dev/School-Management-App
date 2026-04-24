import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile { full_name: string; phone: string | null; dob: string | null; gender: string | null; email: string | null; }

const Profile = () => {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone, dob, gender, email").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data as Profile);
      setLoading(false);
    });
  }, [user]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      dob: profile.dob,
      gender: profile.gender,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-72" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="My Profile" description={`Signed in as ${role}.`} />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={profile?.full_name ?? ""} onChange={(e) => setProfile((p) => p && { ...p, full_name: e.target.value })} maxLength={100} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={profile?.phone ?? ""} onChange={(e) => setProfile((p) => p && { ...p, phone: e.target.value })} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of birth</Label>
                <Input type="date" value={profile?.dob ?? ""} onChange={(e) => setProfile((p) => p && { ...p, dob: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Input value={profile?.gender ?? ""} onChange={(e) => setProfile((p) => p && { ...p, gender: e.target.value })} maxLength={20} />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
