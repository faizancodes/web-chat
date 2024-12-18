"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

function SessionInitializer() {
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { 
          credentials: "include",
        });
        if (!response.ok) {
          console.error("Failed to initialize session");
        }
        const data = await response.json();
        console.log("Session status:", data.status);
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };
    
    initSession();
  }, []);
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <SessionInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
