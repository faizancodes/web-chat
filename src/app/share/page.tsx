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

    const preview =
      conversation.data?.messages
        ?.slice(0, 2)
        ?.map((msg: Message) => msg.content)
        ?.join(" - ")
        ?.slice(0, 150) || "";

    return {
      title: `Shared Conversation - WebChat`,
      description: `View this shared conversation on WebChat: ${preview}...`,
      openGraph: {
        title: preview ? `${preview}...` : "Shared Conversation",
        description: `View this shared conversation on WebChat: ${preview}...`,
        type: "website",
        images: [
          {
            url: `/api/og?id=${id}`,
            width: 1200,
            height: 630,
            alt: "Conversation Preview",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: preview ? `${preview}...` : "Shared Conversation",
        description: `View this shared conversation on WebChat: ${preview}...`,
        images: [`/api/og?id=${id}`],
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
