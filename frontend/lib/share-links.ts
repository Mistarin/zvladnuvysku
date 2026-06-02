import { getSitePathUrl } from "@/lib/site-url";

export type ShareableContentType = "material" | "group" | "deck";

const SHARE_PATH_PREFIX: Record<ShareableContentType, string> = {
  material: "/m",
  group: "/s",
  deck: "/k",
};

export function getSharePath(type: ShareableContentType, shareSlug: string) {
  return `${SHARE_PATH_PREFIX[type]}/${shareSlug}`;
}

export function getShareUrl(type: ShareableContentType, shareSlug: string) {
  return getSitePathUrl(getSharePath(type, shareSlug));
}
