"use client";

import { motion } from "framer-motion";

export default function SharedViewSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      <div className="w-full bg-gradient-to-r from-[#2a2b38] via-[#343541] to-[#2a2b38] border-b border-gray-600 p-4 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <motion.div
              className="h-8 w-8 bg-gray-600 rounded-md"
              animate={{ opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-4 w-24 bg-gray-600 rounded-md"
              animate={{ opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-32 pt-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <motion.div
                className="w-8 h-8 rounded-full bg-gray-600"
                animate={{ opacity: [0.5, 0.7, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
              <div className="flex-1 space-y-3">
                <motion.div
                  className="h-4 bg-gray-600 rounded-md w-3/4"
                  animate={{ opacity: [0.5, 0.7, 0.5] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
                <motion.div
                  className="h-4 bg-gray-600 rounded-md w-1/2"
                  animate={{ opacity: [0.5, 0.7, 0.5] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2 + 0.1,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
