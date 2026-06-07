import { useState } from "react";
import { useAdminListBlogPosts, useAdminListMenus } from "@workspace/api-client-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, List as ListIcon, Plus } from "lucide-react";
import { format } from "date-fns";

export default function ContentHub() {
  const { data: postsRes, isLoading: loadingPosts } = useAdminListBlogPosts();
  const { data: menusRes, isLoading: loadingMenus } = useAdminListMenus();

  const posts = postsRes?.data ?? [];
  const menus = menusRes?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Hub</h1>
        <p className="text-muted-foreground mt-1">Manage blog posts and navigation menus.</p>
      </div>

      <Tabs defaultValue="blog">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="blog">Blog Posts</TabsTrigger>
            <TabsTrigger value="menus">Menus</TabsTrigger>
          </TabsList>
          
          <div className="hidden sm:block">
            {/* Dynamic buttons could go here based on active tab, keeping simple for now */}
          </div>
        </div>

        <TabsContent value="blog" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-post">
              <Plus className="w-4 h-4 mr-2" />
              Write Post
            </Button>
          </div>
          <div className="bg-card border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published Date</TableHead>
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
                        <p>No blog posts found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id} className="cursor-pointer group relative">
                      <TableCell className="font-medium">
                        {post.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.status === "published" ? "default" : "secondary"}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.author}</TableCell>
                      <TableCell>
                        {post.publishedAt ? format(new Date(post.publishedAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="menus" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-menu">
              <Plus className="w-4 h-4 mr-2" />
              Create Menu
            </Button>
          </div>
          <div className="bg-card border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Title</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMenus ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : menus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ListIcon className="h-8 w-8 mb-2 opacity-50" />
                        <p>No menus found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  menus.map((menu) => (
                    <TableRow key={menu.id} className="cursor-pointer group relative">
                      <TableCell className="font-medium">
                        {menu.title}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {menu.handle}
                      </TableCell>
                      <TableCell>
                        {menu.items?.length ?? 0} links
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}