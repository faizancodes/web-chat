import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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

// TODO: Make custom open graph image
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
