import path from "path";
import SwaggerParser from "@apidevtools/swagger-parser";

const contractPath = path.resolve(
  process.cwd(),
  "tests/contract/openapi.yaml"
);

let documentPromise: ReturnType<typeof SwaggerParser.parse> | undefined;

export function getOpenApiDocument() {
  if (!documentPromise) {
    documentPromise = SwaggerParser.parse(contractPath);
  }

  return documentPromise;
}
