      let threads: ChatThread[] = [];
      try {
        threads = JSON.parse(
          localStorage.getItem("chatThreads") || "[]"
        ) as ChatThread[];
      } catch (error) {
        console.error("Error parsing chat threads from local storage:", error);
        threads = [];
      }