from flask import Flask, jsonify, abort
import asyncio
from scraper import DaddyliveScraper
import os

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
    "idPrefixes": ["dlhd:"] # Prefix sonuna iki nokta ekledik (dlhd:302 formatı için)
}

@app.route('/manifest.json')
def manifest():
    return jsonify(MANIFEST)

# 2. CATALOG: Stremio ana ekranında kanalları listeler
@app.route('/catalog/tv/daddylive_channels.json')
async def catalog():
    # Flask[async] sayesinde burada doğrudan await kullanabiliyoruz
    channels = await scraper.get_channels()
    metas = []
    
    for ch in channels:
        metas.append({
            "id": f"dlhd:{ch['id']}", # Scraper'dan gelen ID'yi prefix ile birleştiriyoruz
            "type": "tv",
            "name": ch['name'],
            "poster": ch['logo'],
            "background": ch['logo']
        })
    
    return jsonify({"metas": metas})

# 3. STREAM: Kanala tıklandığında oynatılacak linki verir
@app.route('/stream/tv/<stream_id>.json')
async def stream(stream_id):
    # stream_id bize "dlhd:123.json" veya "dlhd:123" olarak gelebilir
    # .json uzantısını ve prefixi temizleyip saf ID'yi alıyoruz
    clean_id = stream_id.replace("dlhd:", "").replace(".json", "")
    
    stream_url = await scraper.get_stream_url(clean_id)
    
    if not stream_url:
        return jsonify({"streams": []})

    return jsonify({
        "streams": [
            {
                "name": "Daddylive HD",
                "title": "⚡ Hızlı Yayın",
                "url": stream_url,
                "behaviorHints": {
                    "notWebReady": False,
                    "proxyHeaders": {
                        "request": {
                            # Buradaki adresi de yeni domainle güncelledik
                            "Referer": "https://dlstreams.top/" 
                        }
                    }
                }
            }
        ]
    })

if __name__ == '__main__':
    # Render için port ayarı
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
    
