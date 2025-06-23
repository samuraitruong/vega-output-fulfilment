import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');

  if (!search) {
    return NextResponse.json({ error: 'Search parameter is required' }, { status: 400 });
  }

  try {
    const url = `https://ratings.fide.com/incl_search_l.php?search=${encodeURIComponent(search)}&simple=1`;
    const response = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      } 
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    return NextResponse.json({ html });
  } catch (error) {
    console.error('Error fetching FIDE data:', error);
    return NextResponse.json({ error: 'Failed to fetch FIDE data' }, { status: 500 });
  }
} 