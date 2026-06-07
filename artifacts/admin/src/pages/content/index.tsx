import { useAdminListBlogPosts, useAdminListMenus } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, List as ListIcon, Plus, Boxes, File, ChevronRight, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { useSearch, useLocation } from "wouter";

const AUTH_HEADER = { Authorization: "Bearer dev-token-mora" };

type MetaobjectEntry = { id: string; type: string; fields: Record<string, string> };
type FileEntry = { id: string; filename: string; size: number; mimeType: string; url: string; createdAt: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContentHub() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const defaultTab = params.get("tab") ?? "blog";

  const { data: postsRes, isLoading: loadingPosts } = useAdminListBlogPosts();
  const { data: menusRes, isLoading: loadingMenus } = useAdminListMenus();

  const { data: metaobjectsRes, isLoading: loadingMeta } = useQuery<{ data: MetaobjectEntry[] }>({
    queryKey: ["/api/admin/content/metaobjects"],
    queryFn: () => fetch("/api/admin/content/metaobjects", { headers: AUTH_HEADER }).then(r => r.json()),
  });

  const { data: filesRes, isLoading: loadingFiles } = useQuery<{ data: FileEntry[] }>({
    queryKey: ["/api/admin/content/files"],
    queryFn: () => fetch("/api/admin/content/files", { headers: AUTH_HEADER }).then(r => r.json()),
  });

  const metaobjects = metaobjectsRes?.data ?? [];
  const files = filesRes?.data ?? [];

  const posts = postsRes?.data ?? [];
  const menus = menusRes?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground mt-1">Manage blog posts, menus, custom objects, and files.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="w-4 h-4" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="menus" className="gap-2">
            <ListIcon className="w-4 h-4" />
            Menus
          </TabsTrigger>
          <TabsTrigger value="metaobjects" className="gap-2">
            <Boxes className="w-4 h-4" />
            Metaobjects
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <File className="w-4 h-4" />
            Files
          </TabsTrigger>
        </TabsList>

        {/* BLOG POSTS */}
        <TabsContent value="blog" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-post" onClick={() => navigate("/content/blog/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Write Post
            </Button>
          </div>

          {/* Desktop */}
          <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPosts ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p>No blog posts yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : posts.map((post) => (
                  <TableRow key={post.id} className="cursor-pointer">
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                    </TableCell>
                    <TableCell>{post.author}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {post.publishedAt ? format(new Date(post.publishedAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {loadingPosts ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{post.title}</p>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {post.author} · {post.publishedAt ? format(new Date(post.publishedAt), "MMM d, yyyy") : "Draft"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* MENUS */}
        <TabsContent value="menus" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-menu" onClick={() => navigate("/content/menus/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Menu
            </Button>
          </div>
          <div className="space-y-3">
            {loadingMenus ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : menus.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <ListIcon className="h-8 w-8 opacity-50" />
                  <p>No menus yet.</p>
                </CardContent>
              </Card>
            ) : menus.map((menu) => (
              <Card
                key={menu.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/content/menus/${menu.id}`)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{menu.title}</p>
                      <p className="text-sm font-mono text-muted-foreground">{menu.handle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{menu.items?.length ?? 0} links</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {menu.items && menu.items.length > 0 && (
                    <div className="mt-3 pl-3 border-l space-y-1">
                      {(menu.items as { title: string; url: string }[]).slice(0, 3).map((item, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                          <span>{item.title}</span>
                          <span className="text-xs text-muted-foreground/60">{item.url}</span>
                        </div>
                      ))}
                      {menu.items.length > 3 && (
                        <p className="text-xs text-muted-foreground/60">+{menu.items.length - 3} more</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* METAOBJECTS */}
        <TabsContent value="metaobjects" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Custom content types like FAQs, size guides, and testimonials.
            </p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Definition
            </Button>
          </div>

          {loadingMeta ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : metaobjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Boxes className="h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">No metaobject definitions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {metaobjects.map((obj) => (
                    <tr key={obj.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium">{obj.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{obj.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(obj.fields).map(k => (
                            <Badge key={k} variant="secondary" className="text-xs font-normal">{k}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Images, PDFs, and documents used across your store.
            </p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          {loadingFiles ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : files.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <File className="h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">No files uploaded yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Filename</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Size</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {files.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {f.mimeType.startsWith("image/")
                            ? <File className="w-4 h-4 text-blue-500" />
                            : <HardDrive className="w-4 h-4 text-muted-foreground" />}
                          <span className="font-medium text-sm">{f.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-mono">{f.mimeType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {formatBytes(f.size)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {format(new Date(f.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
