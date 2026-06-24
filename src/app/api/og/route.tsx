import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title')?.slice(0, 100) || 'SHMC Form';
    const desc = searchParams.get('desc')?.slice(0, 150) || '';

    // Load Waheed font for the title
    const fontPath = join(process.cwd(), 'src', 'app', 'fonts', 'MVAWaheed.ttf');
    const fontData = await readFile(fontPath);

    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: '#111827', // gray-900
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Waheed"',
            color: 'white',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '60px 40px',
              width: '100%',
              height: '100%',
            }}
          >
            <div
              style={{
                fontSize: 32,
                color: '#10b981', // emerald-500
                marginBottom: 40,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              SHMC Forms
            </div>
            
            <div
              style={{
                fontSize: 64,
                marginTop: 20,
                color: '#f3f4f6', // gray-100
                lineHeight: 1.4,
              }}
            >
              {title}
            </div>

            {desc && (
              <div
                style={{
                  fontSize: 32,
                  marginTop: 30,
                  color: '#9ca3af', // gray-400
                  lineHeight: 1.4,
                  maxWidth: '80%',
                }}
              >
                {desc}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Waheed',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    );
  } catch (e: any) {
    console.error(`Error generating OG image: ${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
