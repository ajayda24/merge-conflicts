"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Clock, User, Send, Trash2 } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  content: string;
  is_anonymous: boolean;
  category: string | null;
  created_at: string;
  user_id: string;
}

interface Comment {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  user_id: string;
}

interface ThreadContentProps {
  thread: Thread;
  comments: Comment[];
  userId: string;
  username: string;
}

export function ThreadContent({
  thread,
  comments: initialComments,
  userId,
  username,
}: ThreadContentProps) {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("comments")
      .insert({
        thread_id: thread.id,
        user_id: userId,
        content: newComment.trim(),
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (!error && data) {
      setComments([...comments, data]);
      setNewComment("");
      setIsAnonymous(false);
    }

    setIsSubmitting(false);
  };

  const handleDeleteComment = async (id: string) => {
    setIsDeletingComment(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (!error) {
      setComments(comments.filter((c) => c.id !== id));
    }
    setIsDeletingComment(false);
    setDeleteCommentId(null);
  };

  return (
    <main className="  px-4 py-8 max-w-3xl mx-auto">
      <Link
        href="/community"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Community
      </Link>

      {/* Delete comment confirmation dialog */}
      <Dialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete this reply?</DialogTitle>
            <DialogDescription>
              This will permanently remove your reply. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCommentId(null)}>Cancel</Button>
            <Button
              disabled={isDeletingComment}
              onClick={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {isDeletingComment ? "Deleting..." : "Delete reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thread */}
      <Card className="border-0 shadow-md mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-xl">
                {thread.title}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {thread.is_anonymous ? "Anonymous" : username}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(thread.created_at)}
                </span>
              </div>
            </div>
            {thread.category && (
              <Badge variant="secondary">{thread.category}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap leading-relaxed">
            {thread.content}
          </p>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-medium">
          {comments.length} {comments.length === 1 ? "Response" : "Responses"}
        </h2>

        {comments.map((comment) => (
          <Card key={comment.id} className="border-0 shadow-sm bg-secondary/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {comment.is_anonymous ? "Anonymous" : username}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                {/* Delete button — only for comment owner */}
                {comment.user_id === userId && (
                  <button
                    onClick={() => setDeleteCommentId(comment.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors"
                    title="Delete reply"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed">{comment.content}</p>
            </CardContent>
          </Card>
        ))}

        {/* Add Comment Form */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your support or thoughts..."
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="anonymous-comment"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                  <label
                    htmlFor="anonymous-comment"
                    className="text-sm text-muted-foreground"
                  >
                    Reply anonymously
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
