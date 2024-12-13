import { Metadata } from "next";

export const metadata: Metadata = {
  title: "WebChat",
  description: "A chat interface for the web",
  openGraph: {
    title: "WebChat",
    description: "A chat interface for the web",
    url: "https://webchat.so",
    siteName: "WebChat",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WebChat - A chat interface for the web",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WebChat",
    description: "A chat interface for the web",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://webchat.so"),
};
