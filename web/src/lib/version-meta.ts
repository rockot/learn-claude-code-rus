import { VERSION_META } from "@/lib/constants";

type TranslateFn = (key: string) => string;

function translateWithFallback(
  translate: TranslateFn,
  key: string,
  fallback: string
): string {
  const value = translate(key);
  return value === key ? fallback : value;
}

export function getLocalizedVersionMeta(
  version: string,
  tSession: TranslateFn,
  tSubtitle: TranslateFn,
  tCoreAddition: TranslateFn,
  tKeyInsight: TranslateFn
) {
  const meta = VERSION_META[version];
  if (!meta) {
    return {
      title: version,
      subtitle: "",
      coreAddition: "",
      keyInsight: "",
      layer: undefined,
      prevVersion: null,
    };
  }

  return {
    ...meta,
    title: translateWithFallback(tSession, version, meta.title),
    subtitle: translateWithFallback(tSubtitle, version, meta.subtitle),
    coreAddition: translateWithFallback(tCoreAddition, version, meta.coreAddition),
    keyInsight: translateWithFallback(tKeyInsight, version, meta.keyInsight),
  };
}

export function getLocalizedLayerLabel(
  layerId: string,
  tLayer: TranslateFn
): string {
  return translateWithFallback(tLayer, layerId, layerId);
}
