export const normalizeSearchSections = (
  incoming: Record<string, any> = {},
  displayOrder: string[] = []
) => {
  const pickResults = (segment: any) => {
    if (!segment) return [];
    if (Array.isArray(segment)) return segment;
    if (Array.isArray(segment.results)) return segment.results;
    return [];
  };

  const ordered = displayOrder
    .map((key) => {
      const segment = incoming[key];
      const segmentResults = pickResults(segment);
      if (!segmentResults.length) return null;

      return {
        key,
        total: segment?.total ?? segment?.count ?? segmentResults.length,
        results: segmentResults
      };
    })
    .filter(Boolean);

  const dynamicKeys = Object.keys(incoming).filter(
    (key) => !displayOrder.includes(key)
  );
  const dynamicSections = dynamicKeys
    .map((key) => {
      const segment = incoming[key];
      const segmentResults = pickResults(segment);
      if (!segmentResults.length) return null;

      return {
        key,
        total: segment?.total ?? segment?.count ?? segmentResults.length,
        results: segmentResults
      };
    })
    .filter(Boolean);

  return [...ordered, ...dynamicSections];
};
