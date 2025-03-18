const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error: Failed to copy", error);
    }
  };

  return { copied, copy };
};

export default function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    await copy(shareUrl);
  };
