import { Json } from "./AiApi";

/**
 * Escapes XML special characters in a string.
 */
function escapeXml(unsafe: any): string {
  if (typeof unsafe !== "string") {
    return String(unsafe);
  }
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case "<":
        return "<";
      case ">":
        return ">";
      case "&":
        return "&";
      case "'":
        return "'";
      case '"':
        return '"';
      default:
        return c;
    }
  });
}

/**
 * Recursively encodes any data type to XML.
 */
export function toXml(data: Json, tagName?: string): string {
  if (data === null || data === undefined) {
    return tagName ? `<${tagName}/>` : "";
  }

  if (
    typeof data === "string" ||
    typeof data === "number" ||
    typeof data === "boolean"
  ) {
    return tagName
      ? `<${tagName}>${escapeXml(data)}</${tagName}>`
      : escapeXml(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => toXml(item, tagName || "item")).join("\n");
  }

  if (typeof data === "object") {
    if (!tagName) {
      return Object.entries(data)
        .map(([key, value]) => toXml(value, key))
        .join("\n");
    }
    return `<${tagName}>\n${Object.entries(data)
      .map(([key, value]) => toXml(value, key))
      .join("\n")}\n</${tagName}>`;
  }

  return tagName
    ? `<${tagName}>${escapeXml(String(data))}</${tagName}>`
    : escapeXml(String(data));
}
