import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Exporte les handlers GET et POST pour l'API route handler d'Uploadthing
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
