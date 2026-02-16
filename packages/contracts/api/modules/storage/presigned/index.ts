import { oc } from "@orpc/contract";
import { presignedDownloadContract } from './download';
import { presignedUploadContract } from './upload';

export const presignedRouter = oc.router({
  download: presignedDownloadContract,
  upload: presignedUploadContract,
});

export * from './download';
export * from './upload';