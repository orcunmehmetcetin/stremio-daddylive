import re
import html
from curl_cffi import AsyncSession
from typing import List
from utils import decode_bundle, encrypt 

class DaddyliveScraper:
    def __init__(self):
        self._session = AsyncSession(impersonate="chrome110") 
        self._base_url = "https://dlhd.dad" 

    def _headers(self, referer: str = None):
        headers = {
            "Referer": referer if referer else self._base_url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        return headers

    async def get_channels(self):
        """Kanal listesini daha esnek bir arama ile çeker."""
        channels = []
        try:
            url = f"{self._base_url}/24-7-channels.php"
            response = await self._session.get(url, headers=self._headers())
            
            # YENİ: Sitenin değişen HTML yapısına (boşluklar, tırnaklar) takılmayan esnek arama
            # Bu satır hem eski hem yeni yapıdaki kanalları yakalar.
            matches = re.findall(
                r'href="watch\.php\?id=(\d+)"[^>]*>.*?<div class="card__title">(.*?)</div>',
                response.text,
                re.DOTALL
            )
            
            for channel_id, channel_name in matches:
                name = html.unescape(channel_name.strip())
                channels.append({
                    "id": channel_id,
                    "name": name,
                    "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Galatasaray_Logo.svg/600px-Galatasaray_Logo.svg.png" 
                })
        except Exception as e:
            print(f"Kanal listesi alınamadı: {e}")
        return channels

    async def get_stream_url(self, channel_id: str):
        """Mevcut güvenli link çözme mantığını korur."""
        try:
            page_url = f"{self._base_url}/stream/stream-{channel_id}.php"
            response = await self._session.get(page_url, headers=self._headers())
            
            iframe_match = re.search(r'iframe src="(.*?)"', response.text)
            if not iframe_match:
                return None
            
            source_url = iframe_match.group(1)
            source_res = await self._session.get(source_url, headers=self._headers(page_url))
            
            # Buradaki şifre çözme mantığı önemli, dokunmadık.
            data = decode_bundle(source_res.text)
            if not data:
                # Eğer bundle boşsa klasik sunucudan devam etmeyi dene
                pass
            
            # Sunucu bilgisini al ve dinamik olarak sunucuyu seç (top1, top2 vs.)
            try:
                server_url = f"https://{source_res.url.split('/')[2]}/server_lookup.php?channel_id=stream-{channel_id}"
                server_res = await self._session.get(server_url, headers=self._headers(source_url))
                server_key = server_res.json().get("server_key", "top1")
            except:
                server_key = "top1"

            final_url = f"https://{server_key}new.newkso.ru/{server_key}/stream-{channel_id}/mono.m3u8"
            return final_url
        except Exception as e:
            print(f"Yayın çözülemedi: {e}")
            return None
            
