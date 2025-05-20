export async function decodeStorage(data: unknown): Promise<string> {
  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }
  if (data instanceof Blob) {
    return data.text();
  }
  throw new TypeError('Unsupported storage data type');
}
