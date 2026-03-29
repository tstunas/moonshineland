export interface BoardActionResult {
  success: boolean;
  message: string;
}

export interface ThreadManageActionResult extends BoardActionResult {
  postLimit?: number;
  thread?: {
    title: string;
    isAdultOnly: boolean;
    isChat: boolean;
    isHidden: boolean;
    isSecret: boolean;
    allowOthersReply: boolean;
  };
}
