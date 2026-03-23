"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageCircle, Plus, Users, Clock, User, Trash2 } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  content: string;
  is_anonymous: boolean;
  category: string | null;
  created_at: string;
  user_id: string;
  comments: { count: number }[];
}

interface CommunityContentProps {
  threads: Thread[];
  userId: string;
  username: string;
}

const categories = [
  "General",
  "Anxiety",
  "Depression",
  "Motherhood",
  "Work Stress",
  "Relationships",
  "Self-Care",
  "Menopause",
];

export function CommunityContent({
  threads: initialThreads,
  userId,
  username,
}: CommunityContentProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const filteredThreads = selectedCategory
    ? threads.filter((t) => t.category === selectedCategory)
    : threads;

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("threads")
      .insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        category,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (!error && data) {
      setThreads([{ ...data, comments: [{ count: 0 }] }, ...threads]);
      setTitle("");
      setContent("");
      setCategory("General");
      setIsAnonymous(false);
      setDialogOpen(false);
    }

    setIsSubmitting(false);
  };

  const handleDeleteThread = async (id: string) => {
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("threads").delete().eq("id", id).eq("user_id", userId);
    if (!error) {
      setThreads(threads.filter((t) => t.id !== id));
    }
    setIsDeleting(false);
    setDeleteTargetId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <main className="  px-4 py-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Community
          </h1>
          <p className="text-muted-foreground mt-1">
            A safe space to share, connect, and support each other
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">
                Share with the Community
              </DialogTitle>
              <DialogDescription>
                Your voice matters. Share your thoughts or ask for support.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateThread} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Your Message</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts, experiences, or questions..."
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        category === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Post anonymously</span>
                </div>
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Posting..." : "Share Post"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete this post?</DialogTitle>
            <DialogDescription>
              This will permanently remove your post and all its comments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => deleteTargetId && handleDeleteThread(deleteTargetId)}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {isDeleting ? "Deleting..." : "Delete post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          All Posts
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Threads List */}
      <div className="space-y-4">
        {filteredThreads.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium text-lg mb-1">No posts yet</h3>
              <p className="text-muted-foreground text-sm">
                Be the first to start a conversation
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredThreads.map((thread) => (
            <Card
              key={thread.id}
              className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/community/${thread.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="font-serif text-lg leading-tight">
                      {thread.title}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {thread.is_anonymous ? "Anonymous" : username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(thread.created_at)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {thread.category && (
                      <Badge variant="secondary" className="shrink-0">
                        {thread.category}
                      </Badge>
                    )}
                    {/* Delete button — only for post owner */}
                    {thread.user_id === userId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTargetId(thread.id); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {thread.content}
                </p>
                <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>{thread.comments[0]?.count || 0} comments</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
