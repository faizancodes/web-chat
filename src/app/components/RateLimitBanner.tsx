import { IoWarningOutline } from "react-icons/io5";
import { useEffect, useState, useRef } from "react";

interface RateLimitBannerProps {
  retryAfter: number;
  onTimeUp: () => void;
}

export default function RateLimitBanner({
  retryAfter,
  onTimeUp,
}: RateLimitBannerProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);
  const progress = ((retryAfter - timeLeft) / retryAfter) * 100;
  const onTimeUpRef = useRef(onTimeUp);

  // Update ref when onTimeUp changes
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    // Reset timer if retryAfter changes
    setTimeLeft(retryAfter);
  }, [retryAfter]);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        onTimeUpRef.current();
      }, 0);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime === 0) {
          // Use setTimeout to avoid state updates during render
          setTimeout(() => {
            onTimeUpRef.current();
          }, 0);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-red-600/95 backdrop-blur-sm text-white p-4 shadow-lg border-b border-red-700">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <IoWarningOutline className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              Message limit exceeded. Please wait {timeLeft} seconds.
            </p>
            <div className="mt-2 h-1.5 bg-red-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
