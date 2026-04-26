import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  School, Upload, MapPin, Phone, Mail, User, Calendar,
  DollarSign, Globe, Clock, Building2, Save, Loader2, ImageIcon
} from "lucide-react";

// School Config Schema
const schoolConfigSchema = z.object({
  school_name: z.string().min(2, "School name must be at least 2 characters"),
  school_type: z.enum(["school", "academy"]),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  principal_name: z.string().optional(),
  established_year: z.number().min(1900).max(2100).optional(),
  academic_year: z.string().min(4, "Academic year required"),
  currency: z.string().default("PKR"),
  locale: z.string().default("en"),
  timezone: z.string().default("Asia/Karachi"),
});

type SchoolConfigForm = z.infer<typeof schoolConfigSchema>;

interface SchoolConfig {
  id: string;
  school_name: string;
  school_type: "school" | "academy";
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  principal_name: string | null;
  established_year: number | null;
  academic_year: string;
  currency: string;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

const TIMEZONES = [
  { value: "Asia/Karachi", label: "Pakistan (Asia/Karachi)" },
  { value: "Asia/Dubai", label: "UAE (Asia/Dubai)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia (Asia/Riyadh)" },
  { value: "Asia/Kolkata", label: "India (Asia/Kolkata)" },
  { value: "UTC", label: "UTC" },
];

const CURRENCIES = [
  { value: "PKR", label: "PKR - Pakistani Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "INR", label: "INR - Indian Rupee" },
];

const LOCALES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

const Settings = () => {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SchoolConfigForm>({
    resolver: zodResolver(schoolConfigSchema),
    defaultValues: {
      school_name: "Baseerat School",
      school_type: "school",
      address: "",
      city: "",
      phone: "",
      email: "",
      principal_name: "",
      established_year: new Date().getFullYear(),
      academic_year: "2025-2026",
      currency: "PKR",
      locale: "en",
      timezone: "Asia/Karachi",
    },
  });

  // Fetch school config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("school_config")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No config exists, create default
            await createDefaultConfig();
            return;
          }
          throw error;
        }

        setConfig(data as SchoolConfig);
        setLogoPreview(data.logo_url);
        form.reset({
          school_name: data.school_name,
          school_type: data.school_type as "school" | "academy",
          address: data.address || "",
          city: data.city || "",
          phone: data.phone || "",
          email: data.email || "",
          principal_name: data.principal_name || "",
          established_year: data.established_year || new Date().getFullYear(),
          academic_year: data.academic_year,
          currency: data.currency,
          locale: data.locale,
          timezone: data.timezone,
        });
      } catch (error) {
        console.error("Error fetching school config:", error);
        toast.error("Failed to load school settings");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [form]);

  const createDefaultConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("school_config")
        .insert({
          school_name: "Baseerat School",
          school_type: "school",
          academic_year: "2025-2026",
        })
        .select()
        .single();

      if (error) throw error;

      setConfig(data as SchoolConfig);
      toast.success("Default school configuration created");
    } catch (error) {
      console.error("Error creating default config:", error);
      toast.error("Failed to create default configuration");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: SchoolConfigForm) => {
    if (!config) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("school_config")
        .update({
          ...values,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      toast.success("School settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileName = `school-logo-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("school-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        // Try to create bucket if it doesn't exist
        if (uploadError.message.includes("bucket")) {
          toast.error("Storage bucket not configured. Please create 'school-assets' bucket in Supabase.");
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("school-assets")
        .getPublicUrl(fileName);

      // Update config with logo URL
      const { error: updateError } = await supabase
        .from("school_config")
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", config.id);

      if (updateError) throw updateError;

      setConfig({ ...config, logo_url: publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
      console.error("Logo upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!config || !config.logo_url) return;

    try {
      // Extract filename from URL
      const url = new URL(config.logo_url);
      const pathParts = url.pathname.split("/");
      const fileName = pathParts[pathParts.length - 1];

      // Delete from storage
      if (fileName) {
        await supabase.storage.from("school-assets").remove([fileName]);
      }

      // Update config
      const { error } = await supabase
        .from("school_config")
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq("id", config.id);

      if (error) throw error;

      setConfig({ ...config, logo_url: null });
      setLogoPreview(null);
      toast.success("Logo removed");
    } catch (error) {
      toast.error("Failed to remove logo");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="School-wide configuration" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Settings"
        description="Configure your school profile, contact information, and academic settings."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="system" className="hidden lg:block">System</TabsTrigger>
        </TabsList>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Logo Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  School Logo
                </CardTitle>
                <CardDescription>
                  Upload your school logo. This will be displayed in the header, reports, and ID cards.
                  Recommended size: 200x200px, PNG or JPG.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="School Logo"
                          className="h-full w-full rounded-xl object-contain p-2"
                        />
                      ) : (
                        <School className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !isAdmin}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {logoPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveLogo}
                          disabled={uploading || !isAdmin}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can also place logo at <code className="rounded bg-muted px-1">/pics/logo.png</code> in public folder
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* School Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  School Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school_name">School Name *</Label>
                  <Input
                    id="school_name"
                    placeholder="Baseerat School"
                    {...form.register("school_name")}
                    disabled={!isAdmin}
                  />
                  {form.formState.errors.school_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.school_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_type">Institution Type</Label>
                  <Select
                    value={form.watch("school_type")}
                    onValueChange={(v: "school" | "academy") => form.setValue("school_type", v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">🏫 School</SelectItem>
                      <SelectItem value="academy">📖 Academy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="principal_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Principal Name
                  </Label>
                  <Input
                    id="principal_name"
                    placeholder="Dr. Muhammad Ahmad"
                    {...form.register("principal_name")}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="established_year" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Established Year
                  </Label>
                  <Input
                    id="established_year"
                    type="number"
                    {...form.register("established_year", { valueAsNumber: true })}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street, Gulshan-e-Iqbal"
                    {...form.register("address")}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Karachi"
                    {...form.register("city")}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+92-300-1234567"
                    {...form.register("phone")}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@baseeratschool.edu.pk"
                    {...form.register("email")}
                    disabled={!isAdmin}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic Tab */}
          <TabsContent value="academic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Academic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Current Academic Year *</Label>
                  <Input
                    id="academic_year"
                    placeholder="2025-2026"
                    {...form.register("academic_year")}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Currency
                  </Label>
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(v) => form.setValue("currency", v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Language / Locale</Label>
                  <Select
                    value={form.watch("locale")}
                    onValueChange={(v) => form.setValue("locale", v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone
                  </Label>
                  <Select
                    value={form.watch("timezone")}
                    onValueChange={(v) => form.setValue("timezone", v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Database:</span>
                    <p className="font-medium">Supabase PostgreSQL</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auth:</span>
                    <p className="font-medium">Supabase Auth (JWT)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Row Level Security:</span>
                    <p className="font-medium">Enabled</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Storage:</span>
                    <p className="font-medium">Supabase Storage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {!isAdmin && (
              <p className="text-sm text-muted-foreground">Only administrators can modify settings</p>
            )}
            <Button type="submit" disabled={saving || !isAdmin} className="min-w-[150px]">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
};

export default Settings;
