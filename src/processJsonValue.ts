import { Json } from "./aiTools/JsonSchema";

/**
 * A function that takes a string and returns a processed string.
 * This type is used for the more general JSON processing function.
 */
export type StringProcessor = (content: string) => string;

/**
 * Recursively processes strings within a Json argument (object, array, string, etc.).
 * Applies the given stringProcessor function to all string values.
 * This function ensures that the processed output remains a valid Json structure.
 * @param value The Json value to process.
 * @param stringProcessor A function that takes a string and returns a processed string.
 * @returns The processed Json value.
 */
export function processJsonValue(
  value: Json,
  stringProcessor: StringProcessor
): Json {
  if (typeof value === "string") {
    return stringProcessor(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => processJsonValue(item, stringProcessor));
  }

  if (typeof value === "object" && value !== null) {
    const newObj: { [key: string]: Json } = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        newObj[key] = processJsonValue(
          (value as { [key: string]: Json })[key],
          stringProcessor
        );
      }
    }
    return newObj;
  }

  return value;
}
