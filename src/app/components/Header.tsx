export default function Header() {
  return (
    <div className="w-full bg-gradient-to-r from-[#2a2b38] via-[#343541] to-[#2a2b38] border-b border-gray-600 p-4 shadow-lg">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center transform hover:rotate-12 transition-transform duration-300">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide hover:text-blue-400 transition-colors duration-300">
              Web Chat
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
