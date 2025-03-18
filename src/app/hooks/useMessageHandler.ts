  const [parseError, setParseError] = useState<string | null>(null);

...      
} catch (e) {
  console.error("Error parsing SSE message:", e);
  setParseError("Failed to parse server response.");
}

//In ClientPage.tsx:
{parseError && <div>{parseError}</div>}