/// <reference lib="webworker" />
/**
 * Web Worker for parsing DICO XML files using the regex-based parseDicoXml.
 * Runs off the main thread so large files (100+ MB) don't freeze the UI.
 * Does NOT use DOMParser — works in all worker environments.
 */

import { parseDicoXml } from "./parse-dico-xml";

self.onmessage = function (e: MessageEvent<string>) {
  try {
    const result = parseDicoXml(e.data, (pct) => {
      self.postMessage({ progress: pct });
    });
    self.postMessage(result);
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
