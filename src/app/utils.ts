const tempDiv = document.createElement("div");
tempDiv.textContent = DOMPurify.sanitize(content);
