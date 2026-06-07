import { useAdminListBlogPosts, useAdminListMenus } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, List as ListIcon, Plus, Boxes, File, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useSearch, useLocation } from "wouter";

export default function ContentHub() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const defaultTab = params.get("tab") ?? "blog";

  const { data: postsRes, isLoading: loadingPosts } = useAdminListBlogPosts();
  const { data: menusRes, isLoading: loadingMenus } = useAdminListMenus();

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
          <div className="flex justify-end">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Definition
            </Button>
          </div>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Boxes className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No metaobject definitions</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Metaobjects let you create custom content types — like testimonials, FAQs, or team members.
              </p>
              <Button className="mt-1">
                <Plus className="w-4 h-4 mr-2" />
                Create Definition
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <File className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No files uploaded</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Upload images, videos, and documents to use across your store.
              </p>
              <Button className="mt-1">
                <Plus className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
