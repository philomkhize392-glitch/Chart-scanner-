export interface ResearchedArticle {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  summary: string;
  fetchedBody: string;
  isOfficial: boolean;
}

export interface UpcomingCalendarItem {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

export interface NewsResearchResult {
  available: boolean;
  articles: ResearchedArticle[];
  upcomingCalendar: UpcomingCalendarItem[];
  officialScheduleText: string;
  officialScheduleUrl: string | null;
  unavailableReason: string | null;
}

const OFFICIAL_DOMAINS = [
  'federalreserve.gov',
  'bls.gov',
  'bea.gov',
  'treasury.gov',
  'ecb.europa.eu',
  'bankofengland.co.uk',
  'boj.or.jp',
  'snb.ch',
  'rba.gov.au',
  'bankofcanada.ca',
  'ismworld.org',
];

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(regex);
  return match ? decodeXmlEntities(match[1]) : '';
}

function extractAtomLink(block: string): string {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (hrefMatch) return hrefMatch[1].trim();
  return extractTag(block, 'link');
}

function isOfficialUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return OFFICIAL_DOMAINS.some((domain) => lower.includes(domain));
}

async function fetchRssFeed(
  url: string,
  defaultSource: string,
  forceOfficial = false
): Promise<ResearchedArticle[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChartScope/1.0)',
        Accept: 'application/rss+xml, application/xml, application/atom+xml, text/xml',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];

    const items: ResearchedArticle[] = [];
    for (const block of blocks.slice(0, 18)) {
      const title = extractTag(block, 'title');
      const link = extractAtomLink(block);
      const pubRaw =
        extractTag(block, 'pubDate') ||
        extractTag(block, 'dc:date') ||
        extractTag(block, 'updated') ||
        extractTag(block, 'published');
      const summary =
        extractTag(block, 'description') ||
        extractTag(block, 'summary') ||
        extractTag(block, 'content');
      const sourceTag = extractTag(block, 'source');

      if (!title || !link || !link.startsWith('http')) continue;

      let parsedDate = pubRaw;
      if (pubRaw) {
        const d = new Date(pubRaw);
        if (!Number.isNaN(d.getTime())) {
          parsedDate = d.toISOString();
        }
      }

      items.push({
        title,
        url: link,
        sourceName: sourceTag || defaultSource,
        publishedAt: parsedDate || 'Date not listed in feed',
        summary: summary.slice(0, 500),
        fetchedBody: '',
        isOfficial: forceOfficial || isOfficialUrl(link),
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchPagePlainText(url: string, maxChars = 4000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return '';
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return '';
    }
    const html = await res.text();
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    const scopedHtml = mainMatch ? mainMatch[0] : html;
    const cleaned = scopedHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<(?:nav|header|footer|aside)[\s\S]*?<\/(?:nav|header|footer|aside)>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 180) return '';
    const currentYear = String(new Date().getUTCFullYear());
    const yearIdx = cleaned.indexOf(`${currentYear} `);
    if (yearIdx > 400 && cleaned.length > maxChars) {
      const start = Math.max(0, yearIdx - 200);
      return cleaned.slice(start, start + maxChars);
    }
    return cleaned.slice(0, maxChars);
  } catch {
    return '';
  }
}

async function fetchUpcomingCalendarEvents(economicEvent: string): Promise<UpcomingCalendarItem[]> {
  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as UpcomingCalendarItem[];
    if (!Array.isArray(rows)) return [];

    const nowMs = Date.now();
    const keywords = getEventKeywords(economicEvent);

    const futureEvents = rows.filter((row) => {
      const t = new Date(row.date).getTime();
      return !Number.isNaN(t) && t >= nowMs - 3600_000;
    });

    const matched = futureEvents.filter((row) => {
      const text = `${row.title} ${row.country}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });

    if (matched.length > 0) return matched.slice(0, 8);
    return futureEvents.filter((r) => r.impact === 'High' || r.impact === 'Medium').slice(0, 8);
  } catch {
    return [];
  }
}

function getOfficialSchedulePage(economicEvent: string): { url: string; label: string } | null {
  const ev = economicEvent.toUpperCase();
  if (ev.includes('FOMC') || ev.includes('FEDERAL')) {
    return {
      url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      label: 'Federal Reserve FOMC Meeting Calendar',
    };
  }
  if (ev.includes('GDP') || ev.includes('PCE')) {
    return {
      url: 'https://www.bea.gov/news/schedule/full',
      label: 'U.S. Bureau of Economic Analysis Release Schedule',
    };
  }
  if (ev.includes('ECB')) {
    return {
      url: 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html',
      label: 'European Central Bank Monetary Policy Calendar',
    };
  }
  if (ev.includes('BOE')) {
    return {
      url: 'https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates',
      label: 'Bank of England Upcoming MPC Dates',
    };
  }
  if (ev.includes('BOJ')) {
    return {
      url: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
      label: 'Bank of Japan Monetary Policy Meeting Schedule',
    };
  }
  return null;
}

function getRelevantOfficialFeeds(economicEvent: string): Array<{ url: string; label: string }> {
  const ev = economicEvent.toUpperCase();
  const feeds: Array<{ url: string; label: string }> = [];

  if (ev.includes('FOMC') || ev.includes('FEDERAL')) {
    feeds.push({
      url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
      label: 'Federal Reserve Monetary Policy',
    });
  } else if (
    ev.includes('CPI') ||
    ev.includes('PPI') ||
    ev.includes('NFP') ||
    ev.includes('UNEMPLOYMENT') ||
    ev.includes('JOLTS')
  ) {
    feeds.push({
      url: 'https://www.bls.gov/feed/bls_latest.rss',
      label: 'U.S. Bureau of Labor Statistics',
    });
  } else if (ev.includes('ECB')) {
    feeds.push({
      url: 'https://www.ecb.europa.eu/rss/press.html',
      label: 'European Central Bank',
    });
  } else if (ev.includes('BOE')) {
    feeds.push({
      url: 'https://www.bankofengland.co.uk/rss/news',
      label: 'Bank of England',
    });
  } else if (ev.includes('BOJ')) {
    feeds.push({
      url: 'https://www.boj.or.jp/en/rss/whatsnew.xml',
      label: 'Bank of Japan',
    });
  }

  return feeds;
}

function getEventKeywords(economicEvent: string): string[] {
  const ev = economicEvent.toUpperCase();
  if (ev.includes('FOMC') || ev.includes('FEDERAL')) return ['fomc', 'federal reserve', 'federal funds', 'rate', 'powell'];
  if (ev.includes('NFP')) return ['payroll', 'employment', 'jobs', 'nonfarm', 'non-farm'];
  if (ev.includes('CPI')) return ['cpi', 'consumer price', 'inflation'];
  if (ev.includes('PPI')) return ['ppi', 'producer price'];
  if (ev.includes('PCE')) return ['pce', 'personal consumption'];
  if (ev.includes('GDP')) return ['gdp', 'gross domestic product'];
  if (ev.includes('PMI')) return ['pmi', 'ism', 'purchasing managers', 'manufacturing', 'services'];
  if (ev.includes('JOLTS')) return ['jolts', 'job openings'];
  if (ev.includes('UNEMPLOYMENT')) return ['unemployment'];
  if (ev.includes('RETAIL')) return ['retail sales'];
  if (ev.includes('JOBLESS')) return ['jobless claims', 'unemployment claims'];
  if (ev.includes('ECB')) return ['ecb', 'european central bank', 'lagarde', 'main refinancing'];
  if (ev.includes('BOE')) return ['boe', 'bank of england', 'mpc', 'official bank rate'];
  if (ev.includes('BOJ')) return ['boj', 'bank of japan', 'ueda', 'policy rate'];
  return [economicEvent.toLowerCase()];
}

function getYahooNewsTickers(market: string): string {
  const m = market.toUpperCase();
  if (m === 'XAUUSD') return 'GC=F,DX-Y.NYB';
  if (m === 'EURUSD') return 'EURUSD=X,DX-Y.NYB';
  if (m === 'GBPUSD') return 'GBPUSD=X,DX-Y.NYB';
  if (m === 'USDJPY') return 'USDJPY=X,DX-Y.NYB';
  if (m === 'BTCUSD') return 'BTC-USD';
  if (m === 'ETHUSD') return 'ETH-USD';
  if (m === 'NAS100') return '^NDX,QQQ';
  if (m === 'US500') return '^GSPC,SPY';
  return 'DX-Y.NYB,^GSPC';
}

export async function researchEconomicNews(
  market: string,
  economicEvent: string
): Promise<NewsResearchResult> {
  const nowYear = new Date().getUTCFullYear();
  const officialFeeds = getRelevantOfficialFeeds(economicEvent);
  const schedulePage = getOfficialSchedulePage(economicEvent);

  const nextQuery1 = `next ${economicEvent} release date forecast ${nowYear} ${market}`;
  const nextQuery2 = `upcoming ${economicEvent} expectations forecast`;
  const googleNextUrl1 = `https://news.google.com/rss/search?q=${encodeURIComponent(
    nextQuery1
  )}&hl=en-US&gl=US&ceid=US:en`;
  const googleNextUrl2 = `https://news.google.com/rss/search?q=${encodeURIComponent(
    nextQuery2
  )}&hl=en-US&gl=US&ceid=US:en`;
  const yahooRssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    getYahooNewsTickers(market)
  )}&region=US&lang=en-US`;

  const [upcomingCalendar, officialScheduleText, ...feedResults] = await Promise.all([
    fetchUpcomingCalendarEvents(economicEvent),
    schedulePage ? fetchPagePlainText(schedulePage.url, 2600) : Promise.resolve(''),
    ...officialFeeds.map((f) => fetchRssFeed(f.url, f.label, true)),
    fetchRssFeed(googleNextUrl1, 'Google News', false),
    fetchRssFeed(googleNextUrl2, 'Google News', false),
    fetchRssFeed(yahooRssUrl, 'Yahoo Finance', false),
  ]);

  const allItems = feedResults.flat();

  if (allItems.length === 0 && upcomingCalendar.length === 0 && !officialScheduleText) {
    return {
      available: false,
      articles: [],
      upcomingCalendar: [],
      officialScheduleText: '',
      officialScheduleUrl: null,
      unavailableReason:
        'Public economic calendars, official schedules, and financial news endpoints returned no reachable data. Check internet connectivity and try again.',
    };
  }

  const keywords = getEventKeywords(economicEvent);
  const scored = allItems.map((item) => {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 3;
    }
    if (haystack.includes(market.toLowerCase())) score += 2;
    if (haystack.includes('next') || haystack.includes('upcoming') || haystack.includes('forecast') || haystack.includes('preview')) {
      score += 2;
    }
    if (item.isOfficial) score += 1;
    return { item, score };
  });

  const seen = new Set<string>();
  const ranked = scored
    .filter((s) => s.score > 0 || !s.item.isOfficial)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.item.publishedAt.localeCompare(a.item.publishedAt);
    })
    .map((s) => s.item)
    .filter((item) => {
      const key = item.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const officialTop = ranked.filter((a) => a.isOfficial).slice(0, 2);
  const newsTop = ranked.filter((a) => !a.isOfficial).slice(0, 4);
  const filtered = [...officialTop, ...newsTop].slice(0, 6);

  if (schedulePage && officialScheduleText) {
    filtered.unshift({
      title: schedulePage.label,
      url: schedulePage.url,
      sourceName: 'Official Calendar',
      publishedAt: new Date().toISOString(),
      summary: 'Official central bank / statistical agency release calendar.',
      fetchedBody: officialScheduleText,
      isOfficial: true,
    });
  }

  const topToRead = filtered.filter((a) => !a.fetchedBody).slice(0, 2);
  const bodies = await Promise.all(
    topToRead.map((art) =>
      art.url.includes('news.google.com/rss/articles') ? Promise.resolve('') : fetchPagePlainText(art.url, 1500)
    )
  );

  for (let i = 0; i < topToRead.length; i++) {
    topToRead[i].fetchedBody = bodies[i];
  }

  return {
    available: filtered.length > 0 || upcomingCalendar.length > 0,
    articles: filtered.slice(0, 7),
    upcomingCalendar,
    officialScheduleText,
    officialScheduleUrl: schedulePage?.url || null,
    unavailableReason: null,
  };
}
