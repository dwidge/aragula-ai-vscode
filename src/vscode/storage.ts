import * as vscode from "vscode";

/** Retrieves a value from global state. */
export function getGlobalState<T>(
  context: vscode.ExtensionContext,
  key: string,
  defaultValue: T
): T {
  return context.globalState.get<T>(key, defaultValue);
}

/** Sets a value in global state. */
export async function setGlobalState<T>(
  context: vscode.ExtensionContext,
  key: string,
  value: T
): Promise<void> {
  await context.globalState.update(key, value);
}

/** Retrieves a string array from global state, maintaining MRU order. */
export function getGlobalStateStringArray(
  context: vscode.ExtensionContext,
  key: string
): string[] {
  return getGlobalState<string[]>(context, key, []);
}

/** Saves a string to a global state array, adding to front if not exists. */
export async function saveToGlobalStateStringArray(
  context: vscode.ExtensionContext,
  key: string,
  item: string
): Promise<void> {
  let items = getGlobalStateStringArray(context, key);
  if (!items.includes(item)) {
    items.unshift(item);
    await setGlobalState(context, key, items);
  }
}

/** Uses a string from a global state array, moving it to the front (MRU). */
export async function useInGlobalStateStringArray(
  context: vscode.ExtensionContext,
  key: string,
  item: string
): Promise<void> {
  let items = getGlobalStateStringArray(context, key);
  const filteredItems = items.filter((p) => p !== item);
  filteredItems.unshift(item);
  await setGlobalState(context, key, filteredItems);
}

/** Deletes a string from a global state array. */
export async function deleteFromGlobalStateStringArray(
  context: vscode.ExtensionContext,
  key: string,
  item: string
): Promise<void> {
  let items = getGlobalStateStringArray(context, key);
  const updatedItems = items.filter((p) => p !== item);
  await setGlobalState(context, key, updatedItems);
}

/** Retrieves an array of objects with a 'name' property from global state. */
export function getGlobalStateObjects<T extends { name: string }>(
  context: vscode.ExtensionContext,
  key: string
): T[] {
  return getGlobalState<T[]>(context, key, []);
}

/** Saves or updates an object with a 'name' property in a global state array.
 * If oldName is provided, it finds and replaces the object with oldName.
 * Otherwise, it finds and replaces by obj.name or adds if not found.
 */
export async function saveGlobalStateObject<T extends { name: string }>(
  context: vscode.ExtensionContext,
  key: string,
  obj: T,
  oldName?: string
): Promise<void> {
  let objects = getGlobalStateObjects<T>(context, key);
  const nameToFind = oldName ?? obj.name;
  const existingIndex = objects.findIndex((o) => o.name === nameToFind);

  if (existingIndex > -1) {
    objects[existingIndex] = obj;
  } else {
    objects.push(obj);
  }
  await setGlobalState(context, key, objects);
}

/** Deletes an object with a specific name from a global state array. */
export async function deleteGlobalStateObject<T extends { name: string }>(
  context: vscode.ExtensionContext,
  key: string,
  name: string
): Promise<void> {
  let objects = getGlobalStateObjects<T>(context, key);
  const updatedObjects = objects.filter((o) => o.name !== name);
  await setGlobalState(context, key, updatedObjects);
}

/** Retrieves a value from workspace state using a key prefix and tabId. */
export function getWorkspaceState<T>(
  context: vscode.ExtensionContext,
  keyPrefix: string,
  tabId: string,
  defaultValue: T
): T {
  const key = `${keyPrefix}-${tabId}`;
  return context.workspaceState.get<T>(key, defaultValue);
}

/** Sets a value in workspace state using a key prefix and tabId. */
export async function setWorkspaceState<T>(
  context: vscode.ExtensionContext,
  keyPrefix: string,
  tabId: string,
  value: T
): Promise<void> {
  const key = `${keyPrefix}-${tabId}`;
  await context.workspaceState.update(key, value);
}
