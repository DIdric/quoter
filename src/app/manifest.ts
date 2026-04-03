import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quoter",
    short_name: "Quoter",
    description: "Professionele offertes voor aannemers",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#0EC541",
    icons: [
      {
        src: "/Bug Quoter.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
