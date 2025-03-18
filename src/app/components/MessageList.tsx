const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (
      messagesRef.current[messagesRef.current.length - 1]?.role === "ai" ||
      searchResults.length > 0
    ) {
      scrollToBottom();
    }
  }, [searchResults]);