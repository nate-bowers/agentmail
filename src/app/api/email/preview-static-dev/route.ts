// Temporary local-only preview route. No auth. Returns a fully rendered HTML
// preview of the daily brief using static synthetic data — useful for visual
// design review without burning Claude tokens. Delete after design sign-off.

import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import DailyBriefEmail from '@/components/email/DailyBriefEmail';

const sections = [
  {
    type: 'weather',
    data: {
      locations: [
        { name: 'San Francisco, CA', tempF: 65, condition: 'Clear sky', humidity: '52%', high: 74, low: 56 },
      ],
    },
  },
  {
    type: 'news',
    data: {
      articles: [
        {
          headline: 'Federal Reserve holds rates steady amid easing inflation signals',
          source: 'Reuters',
          summary:
            'The Fed left its benchmark rate unchanged on Wednesday, citing softer inflation prints. Officials hinted at one more cut later this year if the labor market continues to cool.',
          url: 'https://www.reuters.com/world/us/fed-holds-rates-2026-05-18/',
        },
        {
          headline: 'Apple unveils on-device foundation model for developers at WWDC',
          source: 'The Verge',
          summary:
            'Apple announced a new on-device foundation model available to third-party apps starting iOS 19. The move is positioned as a privacy-focused alternative to cloud-based assistants.',
          url: 'https://www.theverge.com/2026/05/18/apple-foundation-model-wwdc',
        },
        {
          headline: 'EU agrees framework for cross-border energy grid by 2030',
          source: 'Financial Times',
          summary:
            'The 27 member states ratified a proposal to interconnect national grids and pool reserves. Implementation begins next year with a target completion of 2030.',
          url: 'https://www.ft.com/content/eu-energy-grid-2026-05-18',
        },
      ],
    },
  },
  {
    type: 'quote',
    data: {
      text: 'You have power over your mind, not outside events. Realize this, and you will find strength.',
      author: 'Marcus Aurelius',
    },
  },
  {
    type: 'markets',
    data: {
      symbols: [
        { symbol: 'SPY', price: '$558.21', change: '+$3.14', changePercent: '+0.57%', direction: 'up' },
        { symbol: 'NVDA', price: '$132.04', change: '-$1.22', changePercent: '-0.92%', direction: 'down' },
        { symbol: 'AAPL', price: '$224.66', change: '+$0.88', changePercent: '+0.39%', direction: 'up' },
      ],
    },
  },
  {
    type: 'fact',
    data: {
      fact: 'Octopuses have three hearts and blue blood.',
      explanation:
        'Two hearts pump blood through the gills, while the third pumps it through the rest of the body. Their blood is blue because it uses a copper-based protein called hemocyanin to carry oxygen.',
      category: 'biology',
    },
  },
  {
    type: 'word_of_day',
    data: {
      word: 'sonder',
      partOfSpeech: 'noun',
      definition: 'The realization that each random passerby is living a life as vivid and complex as your own.',
      etymology: 'Coined by John Koenig in the Dictionary of Obscure Sorrows.',
      exampleSentence: 'Walking through the airport terminal, she was overcome by a wave of sonder.',
    },
  },
];

export async function GET() {
  const html = await render(
    DailyBriefEmail({
      userName: 'Nate',
      date: 'Monday, May 18, 2026',
      sections: sections as never,
      unsubscribeToken: 'preview-token',
      showUpgradeCta: true,
      mailingAddress: 'P.O. Box 123, San Francisco, CA 94103 (DEV PREVIEW)',
    })
  );
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
