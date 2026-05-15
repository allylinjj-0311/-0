const NOTION_VERSION = '2022-06-28';

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

type RequestBody = Record<string, unknown>;

const text = (content: unknown = '') => ({
  rich_text: splitRichText(String(content || '')).map((chunk) => ({ text: { content: chunk } })),
});

export default async function handler(
  req: { method?: string; body?: RequestBody | string },
  res: VercelResponse,
) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const notionToken = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
      return res.status(500).json({
        error: '缺少 Notion 設定。請在 Vercel 環境變數加入 NOTION_API_KEY 和 NOTION_DATABASE_ID。',
      });
    }

    const body = parseBody(req.body);
    const recordedAt = String(body.recordedAt || new Date().toISOString());
    const userName = String(body.userName || '').trim() || 'Anonymous';

    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          userName: {
            title: [{ text: { content: userName } }],
          },
          city: text(body.city),
          recordedAt: text(recordedAt),
          Temp: text(typeof body.temp === 'number' ? String(body.temp) : ''),
          Humidity: text(typeof body.humidity === 'number' ? String(body.humidity) : ''),
          'Weather Condition': text(body.weatherCondition),
          Percentages: text(body.percentages),
          User_Image: text(body.userImage),
          Tops: text(body.tops),
          Bottoms: text(body.bottoms),
          Weather_Context: text(body.weatherContext),
          Breathability: text(typeof body.breathability === 'number' ? String(body.breathability) : ''),
          Wrapping: text(typeof body.wrapping === 'number' ? String(body.wrapping) : ''),
          Stuffiness: text(typeof body.stuffiness === 'number' ? String(body.stuffiness) : ''),
        },
      }),
    });

    const responseBody = await notionResponse.json();

    if (!notionResponse.ok) {
      return res.status(notionResponse.status).json({
        error: 'Notion 寫入失敗。',
        details: responseBody,
      });
    }

    return res.status(200).json({
      id: responseBody.id,
      url: responseBody.url,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Notion 寫入時發生未知錯誤。',
    });
  }
}

function parseBody(body: RequestBody | string | undefined): RequestBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as RequestBody;
    } catch {
      return {};
    }
  }
  return body;
}

function splitRichText(content: string) {
  if (!content) return [];
  const chunks = [];
  for (let index = 0; index < content.length && chunks.length < 100; index += 1900) {
    chunks.push(content.slice(index, index + 1900));
  }
  return chunks;
}
