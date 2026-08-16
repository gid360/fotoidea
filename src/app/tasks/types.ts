export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "PENDING" | "DONE" | "OVERDUE" | "ARCHIVED";
  category?: string;
  assignedToIds: string[];
  assignedTo: { id: string; name: string }[];
  createdBy: { id: string; name: string } | null;
  clientId: string | null;
  client: { id: string; name: string | null; phone: string } | null;
  createdAt: string;
  attachments: { name: string; url: string }[];
  commentsCount?: number;
}

export interface TaskCategoryDto {
  id: string;
  name: string;
  color: string;
  sortOrder?: number;
}

export interface CommentItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  text: string;
  createdAt: string;
  parentId?: string | null;
}

export interface TreeCommentNode extends CommentItem {
  children: TreeCommentNode[];
}
