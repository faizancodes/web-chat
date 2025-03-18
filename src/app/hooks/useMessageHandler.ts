const handleRateLimit = (response: Response) => {
    const retryAfter = parseInt(response.headers.get("retry-after") || "20");
    setRetryAfter(retryAfter);
    setIsLoading(false);
    setRateLimitError(true);
  };

  // ...

  if (response.status === 429) {
    handleRateLimit(response);
    return;
  }

  // ...

  if (response.status === 429) {
    handleRateLimit(response);
    return;
  }