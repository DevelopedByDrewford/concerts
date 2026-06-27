/** Minimal SmugMug API v2 response shapes used by this app. */

export interface SmugMugApiResponse<T> {
  Response: T;
  Code:    number;
  Message: string;
}

export interface SmugMugFolder {
  Name:    string;
  UrlName: string;
  Uri:     string;
  NodeID:  string;
  Uris: {
    ChildNodes?: { Uri: string };
    FolderAlbums?: { Uri: string };
  };
}

export interface SmugMugAlbum {
  Name:     string;
  UrlName:  string;
  Uri:      string;
  AlbumKey: string;
  Uris: {
    AlbumImages?: { Uri: string };
  };
}

export interface SmugMugImageSize {
  Url:    string;
  Width:  number;
  Height: number;
}

export interface SmugMugVideo {
  Url:    string;
  Width:  number;
  Height: number;
}

export interface SmugMugImage {
  ImageKey:     string;
  Uri:          string;
  ThumbnailUrl: string;
  WebUri:       string;
  IsVideo?:     boolean;
  Uris: {
    ImageSizes?:   { Uri: string; ImageSizes?: SmugMugImageSizes };
    LargestImage?: { Uri: string };
    LargestVideo?: { Video?: SmugMugVideo };
  };
}

export interface SmugMugImageSizes {
  ImageUrlThumb?:   SmugMugImageSize;
  ImageUrlTiny?:    SmugMugImageSize;
  ImageUrlSmall?:   SmugMugImageSize;
  ImageUrlMedium?:  SmugMugImageSize;
  ImageUrlLarge?:   SmugMugImageSize;
  ImageUrlXLarge?:  SmugMugImageSize;
  ImageUrlX2Large?: SmugMugImageSize;
  ImageUrlX3Large?: SmugMugImageSize;
  LargestImage?:    SmugMugImageSize;
}

/** Response from the binary upload endpoint (X-Smug-Version: v2, JSON). */
export interface SmugMugUploadResponse {
  stat:   "ok" | "fail";
  method: string;
  Image?: {
    ImageUri:     string;
    AlbumImageUri: string;
    URL:          string;
  };
  message?: string;
}

export interface SmugMugAuthUser {
  NickName:  string;
  Uri:       string;
  Uris: {
    Node?: { Uri: string };
    Folder?: { Uri: string };
  };
}
