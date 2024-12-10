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

const LoadingSkeleton = () => (
  <div className="space-y-3">
    <motion.div
      className="h-4 bg-gray-600 rounded-md w-3/4"
      animate={{ opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
    <motion.div
      className="h-4 bg-gray-600 rounded-md w-1/2"
      animate={{ opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
    />
    <motion.div
      className="h-4 bg-gray-600 rounded-md w-2/3"
      animate={{ opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
    />
  </div>
);

export default function SearchProgress({
  status,
  searchResults,
}: SearchProgressProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex gap-4 mb-4"
    >
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
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
      <motion.div
        className="flex-1 px-4 py-2 rounded-2xl bg-[#444654] text-white relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-2 flex items-center"
          >
            <span className="mr-2">{status}</span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block w-1 h-4 bg-blue-400"
            />
          </motion.div>
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Sources found:</div>
              {searchResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: "easeOut",
                  }}
                  className="text-sm hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
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
          ) : (
            <LoadingSkeleton />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
