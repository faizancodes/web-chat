import { motion } from "framer-motion";

interface SearchResult {
  title: string;
  link: string;
  source: string;
}

interface SearchProgressProps {
  status: string;
  searchResults: SearchResult[];
}

export default function SearchProgress({
  status,
  searchResults,
}: SearchProgressProps) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-gray-500 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <div className="flex-1 px-4 py-2 rounded-2xl bg-[#444654] text-white">
        <div className="mb-2">{status}</div>
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Sources found:</div>
            {searchResults.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm"
              >
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {result.title}
                </a>
                <div className="text-gray-400 text-xs">{result.source}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
