const NOTION_VERSION = '2022-06-28';

export type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export type NotionProperty = {
  type: string;
  rich_text?: { plain_text?: string }[];
  title?: { plain_text?: string }[];
};

export type OutfitRecord = {
  id: string;
  userName: string;
  city: string;
  temp: number | null;
  humidity: number | null;
  condition: string;
  tops: string;
  bottoms: string;
  percentages: string;
  image: string;
  context: string;
  score: number;
};

export const text = (content = '') => ({
  rich_text: splitRichText(content).map((chunk) => ({ text: { content: chunk } })),
});

export function getNotionConfig() {
  const notionToken = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    throw new Error('缺少 Notion 設定。請在 Vercel 環境變數加入 NOTION_API_KEY 和 NOTION_DATABASE_ID。');
  }

  return { notionToken, databaseId };
}

export function notionHeaders(notionToken: string) {
  return {
    Authorization: `Bearer ${notionToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

export function getPlainText(property?: NotionProperty) {
  if (!property) return '';
  const values = property.type === 'title' ? property.title : property.rich_text;
  return values?.map((item) => item.plain_text || '').join('') || '';
}

export function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function splitItems(value: string) {
  return value
    .split(/[,，、/|｜\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isDisplayableImage(value: string) {
  if (/^https?:\/\//.test(value)) return true;
  if (/^data:image\//.test(value)) return value.length <= 80000;
  return false;
}

export function weatherSimilarity(
  record: OutfitRecord,
  target: { city: string; temp: number; humidity: number; condition: string },
) {
  const tempScore = record.temp === null ? 12 : Math.abs(record.temp - target.temp) * 4;
  const humidityScore = record.humidity === null ? 10 : Math.abs(record.humidity - target.humidity) * 0.5;
  const cityScore = record.city && record.city === target.city ? -6 : 0;
  const conditionScore =
    record.condition && target.condition && (record.condition.includes(target.condition) || target.condition.includes(record.condition))
      ? -8
      : 0;

  return tempScore + humidityScore + cityScore + conditionScore;
}

export function buildFallbackPercentages(temp: number, humidity: number) {
  if (temp <= 18) {
    return [
      { label: '毛衣 SWEATER', val: 45, color: 'bg-zine-ink' },
      { label: '薄長袖 LIGHT_LONGSLEEVE', val: 35, color: 'bg-zine-ink' },
      { label: '長褲 PANTS', val: 70, color: 'bg-zine-ink' },
    ];
  }

  if (humidity >= 80) {
    return [
      { label: '透氣短袖 BREATHABLE_TEE', val: 60, color: 'bg-zine-ink' },
      { label: '薄長袖 LIGHT_LONGSLEEVE', val: 35, color: 'bg-zine-ink' },
      { label: '寬褲 LOOSE_PANTS', val: 45, color: 'bg-zine-ink' },
    ];
  }

  return [
    { label: '薄長袖 LIGHT_LONGSLEEVE', val: 55, color: 'bg-zine-ink' },
    { label: '短袖 T-SHIRT', val: 45, color: 'bg-zine-ink' },
    { label: '長褲 PANTS', val: 50, color: 'bg-zine-ink' },
  ];
}

export function aggregatePercentages(records: OutfitRecord[], temp: number, humidity: number) {
  const counts = new Map<string, number>();
  const sourceRecords = records.filter((record) => record.tops || record.bottoms || record.percentages);

  for (const record of sourceRecords) {
    const items = [
      ...splitItems(record.tops),
      ...splitItems(record.bottoms),
      ...splitItems(record.percentages).map((item) => item.replace(/\s*\d+%$/, '').trim()),
    ];

    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
  }

  if (sourceRecords.length === 0 || counts.size === 0) {
    return buildFallbackPercentages(temp, humidity);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      val: Math.round((count / sourceRecords.length) * 100),
      color: 'bg-zine-ink',
    }));
}

export async function queryOutfitRecords(
  notionToken: string,
  databaseId: string,
  target: { city: string; temp: number; humidity: number; condition: string },
) {
  const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(notionToken),
    body: JSON.stringify({ page_size: 100 }),
  });

  const responseBody = await notionResponse.json();

  if (!notionResponse.ok) {
    throw new Error(responseBody?.message || 'Notion 資料庫查詢失敗。');
  }

  return (responseBody.results || [])
    .map((page: { id: string; properties: Record<string, NotionProperty> }) => {
      const record: OutfitRecord = {
        id: page.id,
        userName: getPlainText(page.properties.userName),
        city: getPlainText(page.properties.city),
        temp: toNumber(getPlainText(page.properties.Temp)),
        humidity: toNumber(getPlainText(page.properties.Humidity)),
        condition: getPlainText(page.properties['Weather Condition']),
        tops: getPlainText(page.properties.Tops),
        bottoms: getPlainText(page.properties.Bottoms),
        percentages: getPlainText(page.properties.Percentages),
        image: getPlainText(page.properties.User_Image),
        context: getPlainText(page.properties.Weather_Context),
        score: 0,
      };

      return {
        ...record,
        score: weatherSimilarity(record, target),
      };
    })
    .sort((a: OutfitRecord, b: OutfitRecord) => a.score - b.score);
}

function splitRichText(content: string) {
  if (!content) return [];
  const chunks = [];
  for (let index = 0; index < content.length && chunks.length < 100; index += 1900) {
    chunks.push(content.slice(index, index + 1900));
  }
  return chunks;
}
