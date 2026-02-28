import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (typeof document === "undefined") {
  GlobalRegistrator.register();
}

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

type TestImportMeta = ImportMeta & {
  env?: ImportMetaEnv;
};

const testImportMeta = import.meta as TestImportMeta;

if (!testImportMeta.env) {
  testImportMeta.env = {
    MODE: "test",
    BASE_URL: "/",
    DEV: "true",
    PROD: "false",
    SSR: "false",
  } as unknown as ImportMetaEnv;
}
