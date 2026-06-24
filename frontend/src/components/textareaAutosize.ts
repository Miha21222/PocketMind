interface ResizableTextarea {
  clientHeight: number;
  offsetHeight: number;
  scrollHeight: number;
  style: {
    height: string;
  };
}

export function resizeTextareaToContent(textarea: ResizableTextarea | null): void {
  if (!textarea) return;
  const borderHeight = textarea.offsetHeight - textarea.clientHeight;
  textarea.style.height = "0px";
  textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
}

export function estimateTextareaRows(value: string, fieldWidth: number, minRows = 4): number {
  const availableWidth = Math.max(fieldWidth - 56, 120);
  const approxBoldCharacterWidth = 13;
  const charactersPerLine = Math.max(Math.floor(availableWidth / approxBoldCharacterWidth), 12);
  const estimatedLines = value.split("\n").reduce((total, line) => total + Math.max(Math.ceil(line.length / charactersPerLine), 1), 0);
  return Math.max(minRows, estimatedLines + 1);
}
