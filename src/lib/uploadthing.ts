import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

// Génère les boutons et zones de drag-and-drop typés pour Uploadthing
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// Génère les hooks React et helpers d'upload (ex: useUploadThing)
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: "/menumanage/api/uploadthing"
});
