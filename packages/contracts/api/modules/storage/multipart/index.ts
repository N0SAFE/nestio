import { oc } from "@orpc/contract";
import { multipartInitiateContract } from './initiate';
import { multipartUploadPartContract } from './upload-part';
import { multipartCompleteContract } from './complete';
import { multipartAbortContract } from './abort';
import { multipartListPartsContract } from './list-parts';

export const multipartRouter = oc.router({
  initiate: multipartInitiateContract,
  uploadPart: multipartUploadPartContract,
  complete: multipartCompleteContract,
  abort: multipartAbortContract,
  listParts: multipartListPartsContract,
});

export * from './initiate';
export * from './upload-part';
export * from './complete';
export * from './abort';
export * from './list-parts';