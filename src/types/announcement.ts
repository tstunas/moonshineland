export interface Announcement {
  id: number;
  title: string;
  content: string;
  rawContent: string;
  contentType: "text" | "aa" | "novel" | "line";
  isHidden: boolean;
  isDeleted: boolean;
  isAdultOnly: boolean;
  createdAt: string;
  updatedAt: string;
  user: number | null;
}
