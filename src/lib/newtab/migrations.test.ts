import { describe, expect, it } from "vitest";
import { migrate } from "./migrations";
import { emptyConfig } from "./defaults";

describe("migrate", () => {
  it("returns emptyConfig for undefined input", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(migrate(undefined)).toEqual(emptyConfig());
  });

  it("returns emptyConfig for empty object", () => {
    expect(migrate({})).toEqual(emptyConfig());
  });

  it("returns emptyConfig for wrong shape", () => {
    expect(migrate({ foo: "bar" })).toEqual(emptyConfig());
    expect(migrate([])).toEqual(emptyConfig());
    expect(migrate("string")).toEqual(emptyConfig());
    expect(migrate(42)).toEqual(emptyConfig());
    // eslint-disable-next-line unicorn/no-null
    expect(migrate(null)).toEqual(emptyConfig());
  });

  it("passes valid v1 config through identity, including upload icons", () => {
    const cfg = emptyConfig();
    cfg.sections[0].shortcuts.push({
      id: "a",
      url: "https://github.com/",
      label: "gh",
      icon: { kind: "auto" },
    }, {
      id: "b",
      url: "https://example.com/",
      label: "ex",
      icon: { kind: "upload", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
    });
    expect(migrate(cfg)).toEqual(cfg);
  });

  it("rejects upload icon missing dataUrl", () => {
    const bad = {
      version: 1,
      sections: [
        {
          id: "default",
          // eslint-disable-next-line unicorn/no-null
          name: null,
          collapsed: false,
          shortcuts: [
            { id: "x", url: "https://x.com/", label: "x", icon: { kind: "upload" } },
          ],
        },
      ],
    };
    expect(migrate(bad)).toEqual(emptyConfig());
  });

  it("returns emptyConfig when version is unknown", () => {
    expect(migrate({ version: 99, sections: [] })).toEqual(emptyConfig());
  });

  it("returns emptyConfig when sections is missing required shape", () => {
    expect(migrate({ version: 1, sections: [{ id: "x" }] })).toEqual(emptyConfig());
  });

  it("ensures default section exists after migration", () => {
    const result = migrate({ version: 1, sections: [] });
    expect(result).toEqual(emptyConfig());
  });
});
