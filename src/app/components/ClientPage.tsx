const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setIsLoading(true);
      fetchConversation(id)
        .then(messages => {
          if (messages) {
            onConversationLoad(messages, id);
          } else {
            setError("Conversation not found.");
          }
        })
        .catch(error => {
          setError("Failed to load conversation.");
          console.error(error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [searchParams, onConversationLoad]);

  if (isLoading) return <div>Loading conversation...</div>;
  if (error) return <div>Error: {error}</div>;
  return null;