import type { PostModel } from "@/generated/prisma/models/Post";
import type { PostImageModel } from "@/generated/prisma/models/PostImage";
export type { ContentType } from "@/generated/prisma/enums";

export type Post = PostModel;

export type PostImage = Pick<PostImageModel, "id" | "imageUrl" | "sortOrder">;

export type PostWithImages = Post & { postImages: PostImage[] };
