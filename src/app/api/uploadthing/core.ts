import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSessionUser } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Route pour uploader les photos de repas
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await getSessionUser();
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: String(user.id) };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload terminé pour l'utilisateur :", metadata.userId);
      console.log("URL de l'image :", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
