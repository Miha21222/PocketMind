import { estimateTextareaRows, resizeTextareaToContent } from "../src/components/textareaAutosize";

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

const textarea = {
  clientHeight: 120,
  offsetHeight: 122,
  scrollHeight: 148,
  style: {
    height: "72px",
  },
};

resizeTextareaToContent(textarea);

assertEqual(textarea.style.height, "150px");

assertEqual(estimateTextareaRows("short text", 320), 4);

const longText = Array(8).fill("Мобільний довгий опис, який має збільшити висоту поля.").join(" ");
if (estimateTextareaRows(longText, 320) <= 4) {
  throw new Error("Expected long mobile text to increase textarea rows");
}
