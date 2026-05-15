import { getNotionConfig, notionHeaders, text, VercelResponse } from './_shared';

export default async function handler(
  req: { method?: string; body: Record<string, any> },
  res: VercelResponse,
) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { notionToken, databaseId } = getNotionConfig();
    const body = req.body || {};
    const recordedAt = body.recordedAt || new Date().toISOString();
    const userName = body.userName?.trim() || 'Anonymous';

    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(notionToken),
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
