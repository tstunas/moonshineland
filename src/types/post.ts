export interface Post {
  id: number;
  boardKey: string;
  threadIndex: number;
  postOrder: number;
  author: string;
  idcode: string;
  content: string;
  rawContent: string;
  contentType: "text" | "aa" | "novel" | "line";
  imageUrl: string | null;
  isHidden: boolean;
  isEdited: boolean;
  isAutoPost: boolean;
  isDeleted: boolean;
  user: number;
  createdAt: string;
  updatedAt: string;
  contentUpdatedAt: string | null;
}
