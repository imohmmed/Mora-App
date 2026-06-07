import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Save } from "lucide-react";
import { toast } from "sonner";

export default function AccountProfile() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSaved(true);
    toast.success("Profile updated successfully.");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tighter uppercase">Profile Settings</h1>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Personal Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input className="h-11" value={form.firstName} onChange={update("firstName")} placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input className="h-11" value={form.lastName} onChange={update("lastName")} placeholder="Smith" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" className="h-11" value={form.email} onChange={update("email")} placeholder="jane@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input type="tel" className="h-11" value={form.phone} onChange={update("phone")} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Change Password</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" className="h-11" value={form.currentPassword} onChange={update("currentPassword")} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" className="h-11" value={form.newPassword} onChange={update("newPassword")} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" className="h-11" value={form.confirmPassword} onChange={update("confirmPassword")} placeholder="Repeat new password" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Default Shipping Address</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <Input className="h-11" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input className="h-11" placeholder="New York" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input className="h-11" placeholder="10001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input className="h-11" placeholder="United States" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="flex-1 h-12 uppercase font-bold tracking-wider flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" className="h-12 px-8" asChild>
              <Link href="/account">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
