import { useState } from "react";
import { useAdminCreateBlogPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";

export default function BlogPostEditor() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPost = useAdminCreateBlogPost();

  const [form, setForm] = useState({
    title: "",
    author: "Mora Team",
    excerpt: "",
    body: "",
    status: "draft" as "draft" | "published",
    publishNow: false,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    createPost.mutate(
      {
        data: {
          title: form.title,
          author: form.author,
          excerpt: form.excerpt,
          body: form.body,
          status: form.status,
          tags: form.tags,
          publishedAt: form.publishNow ? new Date().toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Post saved" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
          navigate("/content?tab=blog");
        },
        onError: () =>
          toast({ title: "Error", description: "Failed to save post.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content?tab=blog" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Post title..."
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="text-lg font-medium"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Short summary shown in listings..."
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Content</Label>
                <Textarea
                  id="body"
                  placeholder="Write your post content here..."
                  rows={14}
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  className="font-mono text-sm leading-relaxed resize-y"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1">
                      {t}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Publish</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <Select value={form.status} onValueChange={(v: "draft" | "published") => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "published" && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="publishNow" className="text-sm">Publish now</Label>
                  <Switch
                    id="publishNow"
                    checked={form.publishNow}
                    onCheckedChange={(v) => set("publishNow", v)}
                  />
                </div>
              )}
              <div className="pt-3 border-t space-y-2">
                <Button type="submit" disabled={createPost.isPending} className="w-full">
                  {createPost.isPending ? "Saving..." : form.status === "published" ? "Publish" : "Save Draft"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/content?tab=blog")}>
                  Discard
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Author</CardTitle></CardHeader>
            <CardContent>
              <Input
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Author name"
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
