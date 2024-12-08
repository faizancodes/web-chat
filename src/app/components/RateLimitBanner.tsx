interface RateLimitBannerProps {
  retryAfter: number;
}

export default function RateLimitBanner({ retryAfter }: RateLimitBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 shadow-lg">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <p className="text-lg font-medium">
          You&apos;ve exceeded the message limit. Please wait {retryAfter}{" "}
          seconds before sending another message.
        </p>
      </div>
    </div>
  );
}
