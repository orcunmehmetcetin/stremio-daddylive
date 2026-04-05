from flask import Flask, jsonify, abort
from scraper import DaddyliveScraper
import asyncio

app = Flask(__name__)
scraper = DaddyliveScraper()

# 1. MANIFEST: Stremio'ya eklentinin kimliğini bildiriyoruz
MANIFEST = {
    "id": "community.daddylive.orcun",
    "version": "1.0.0",
    "name": "Daddylive TR",
    "description": "Daddylive kanallarını reklamsız ve tertemiz izleyin.",
    "types": ["tv"],
    "resources": ["catalog", "stream"],
    "catalogs": [
        {
            "type": "tv",
            "id": "daddylive_channels",
            "name": "Daddylive Canlı TV"
        }
    ],
    "idPrefixes": ["dlhd"] # Kanallarımızın ID formatı (Örn: dlhd:302)
}

@app.route('/manifest.json')
def manifest():
    return jsonify(MANIFEST)

# 2. CATALOG: Stremio ana ekranında kanalları listeler
@app.route('/catalog/tv/daddylive_channels.json')
async def catalog():
    channels = await scraper.get_channels()
    metas = []
    
    for ch in channels:
        metas.append({
            "id": f"dlhd:{ch['id']}",
            "type": "tv",
            "name": ch['name'],
            "poster": ch['logo'], # Logo eşleştirmesi scraper'dan geliyor
            "background": ch['logo']
        })
    
    return jsonify({"metas": metas})

# 3. STREAM: Kanala tıklandığında oynatılacak linki verir
@app.route('/stream/tv/<stream_id>.json')
async def stream(stream_id):
    # ID'den "dlhd:" ön ekini temizleyip sadece rakamı alıyoruz
    clean_id = stream_id.replace("dlhd:", "")
    
    stream_url = await scraper.get_stream_url(clean_id)
    
    if not stream_url:
        return jsonify({"streams": []})

    return jsonify({
        "streams": [
            {
                "title": "Daddylive HD",
                "url": stream_url,
                "behaviorHints": {
                    "notWebReady": False,
                    "proxyHeaders": {
                        "request": {
                            "Referer": "https://dlhd.dad/" # TV'nin hata almaması için gereken kimlik bilgisi
                        }
                    }
                }
            }
        ]
    })

if __name__ == '__main__':
    # Sunucuyu 7000 portunda başlatıyoruz
    app.run(host='0.0.0.0', port=7000)
  
