import { ChatRecord } from "@/pages/pc/ckbox/data";
export interface Messages {
  friendMessage?: ChatRecord | null;
  chatroomMessage?: ChatRecord | null;
  seq: number;
  cmdType: string;
}
