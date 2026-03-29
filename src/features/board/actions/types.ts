export interface BoardActionResult {
  success: boolean;
  message: string;
}

export interface ThreadManageActionResult extends BoardActionResult {
  postLimit?: number;
  thread?: {
    title: string;
    isHidden: boolean;
    isSecret: boolean;
    allowOthersReply: boolean;
  };
}
