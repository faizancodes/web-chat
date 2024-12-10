import React, { Suspense } from "react";
import SharedViewClient from "./SharedViewClient";
import SharedViewSkeleton from "./SharedViewSkeleton";
import { Metadata } from "next";
import { getSharedConversation } from "../api/actions/api-handler";
import { Message } from "@/app/types";
import { Logger } from "@/utils/logger";

const logger = new Logger("share");

export const maxDuration = 60;

interface PageProps {
  params: Promise<{ [key: string]: string | string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const id = resolvedSearchParams.id;

  if (!id || Array.isArray(id)) {
    return {
      title: "Shared Conversation - WebChat",
      description: "View a shared conversation on WebChat",
    };
  }

  try {
    const conversation = await getSharedConversation(id);

    const messages = conversation.data?.messages || [];
    const preview =
      messages
        ?.slice(1, 3)
        ?.map((msg: Message) => msg.content)
        ?.join(" - ")
        ?.slice(0, 120) || "";

    const title = `WebChat: Shared Conversation`;
    const description = `View this shared conversation on WebChat: ${preview}...`;
    const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og?id=${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "WebChat",
        type: "website",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: "WebChat Conversation Preview",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    logger.error("[API] Error generating metadata", { error });
    return {
      title: "Shared Conversation - WebChat",
      description: "View a shared conversation on WebChat",
    };
  }
}

export default async function SharePage() {
  return (
    <Suspense fallback={<SharedViewSkeleton />}>
      <SharedViewClient />
    </Suspense>
  );
}
