import type { Config } from "./types";
import { CONFIG_VERSION } from "./types";

export const DEFAULT_SECTION_ID = "default";

export function emptyConfig(): Config {
  return {
    version: CONFIG_VERSION,
    sections: [
      {
        id: DEFAULT_SECTION_ID,
        // eslint-disable-next-line unicorn/no-null
        name: null,
        collapsed: false,
        shortcuts: [],
      },
    ],
  };
}
