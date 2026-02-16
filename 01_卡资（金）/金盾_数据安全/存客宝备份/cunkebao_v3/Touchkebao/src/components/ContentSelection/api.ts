import request from "@/api/request";

export function getContentLibraryList(params: any) {
  return request("/v1/content/library/list", params, "GET");
}
