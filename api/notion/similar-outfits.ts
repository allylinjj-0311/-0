import {
  aggregatePercentages,
  getNotionConfig,
  isDisplayableImage,
  queryOutfitRecords,
  VercelResponse,
} from './_shared';

export default async function handler(
  req: { method?: string; query: Record<string, string | string[] | undefined> },
  res: VercelResponse,
) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { notionToken, databaseId } = getNotionConfig();
    const target = {
      city: String(req.query.city || ''),
      temp: Number(req.query.temp || 0),
      humidity: Number(req.query.humidity || 0),
      condition: String(req.query.condition || ''),
    };

    const records = await queryOutfitRecords(notionToken, databaseId, target);
    const matchedRecords = records.filter((record) => record.temp !== null || record.humidity !== null).slice(0, 12);
    const recordsForAnalysis = matchedRecords.length > 0 ? matchedRecords : records.slice(0, 12);
    const seenImages = new Set<string>();
    const references = recordsForAnalysis
      .filter((record) => isDisplayableImage(record.image))
      .filter((record) => {
        if (seenImages.has(record.image)) return false;
        seenImages.add(record.image);
        return true;
      })
      .slice(0, 3)
      .map((record) => ({
        image: record.image,
        label: [record.tops, record.bottoms].filter(Boolean).join(' / ') || record.userName || 'Outfit reference',
        context: record.context || `${record.city} ${record.condition} ${record.temp ?? '-'}°C / ${record.humidity ?? '-'}%`,
      }));

    return res.status(200).json({
      percentages: aggregatePercentages(recordsForAnalysis, target.temp, target.humidity),
      references,
      matchedCount: recordsForAnalysis.length,
      summary:
        recordsForAnalysis.length > 0
          ? `已比對 ${recordsForAnalysis.length} 筆相似天氣紀錄`
          : '目前資料庫尚無可比對紀錄，先以天氣規則產生建議',
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : '查詢相似天氣穿搭時發生未知錯誤。',
    });
  }
}
