import re
import html
from curl_cffi import AsyncSession
from typing import List
from utils import decode_bundle, encrypt # utils.py'den şifreleme fonksiyonlarını alıyoruz

class DaddyliveScraper:
    def __init__(self):
        # Tarayıcıyı taklit eden oturum
        self._session = AsyncSession(impersonate="chrome110") 
        self._base_url = "https://dlstreams.top" # Sitenin ana adresi

    def _headers(self, referer: str = None):
        """Daddylive'ın istediği kimlik bilgilerini hazırlar."""
        headers = {
            "Referer": referer if referer else self._base_url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        return headers

    async def get_channels(self):
        """Sitedeki tüm 24/7 kanalları tarayıp listeler."""
        channels = []
        try:
            url = f"{self._base_url}/24-7-channels.php"
            response = await self._session.get(url, headers=self._headers())
            
            # HTML içinden kanal ID ve isimlerini Regex ile cımbızlıyoruz
            matches = re.findall(
                r'<a class="card"\s+href="/watch\.php\?id=(\d+)"[^>]*>\s*<div class="card__title">(.*?)</div>',
                response.text,
                re.DOTALL
            )
            
            for channel_id, channel_name in matches:
                name = html.unescape(channel_name.strip())
                channels.append({
                    "id": channel_id,
                    "name": name,
                    "logo": f"https://restored-logo-url.com/{channel_id}.png" # Logo eşleşmesi gerekebilir
                })
        except Exception as e:
            print(f"Kanal listesi alınamadı: {e}")
        return channels

    async def get_stream_url(self, channel_id: str):
        """Stremio'da bir kanala tıklandığında asıl yayın linkini çözer."""
        try:
            page_url = f"{self._base_url}/stream/stream-{channel_id}.php"
            response = await self._session.get(page_url, headers=self._headers())
            
            # Gizli iframe linkini bul
            iframe_match = re.search(r'iframe src="(.*?)"', response.text)
            if not iframe_match:
                return None
            
            source_url = iframe_match.group(1)
            source_res = await self._session.get(source_url, headers=self._headers(page_url))
            
            # Daddylive'ın güvenlik paketini (bundle) çöz
            data = decode_bundle(source_res.text)
            if not data:
                return None
            
            # Sunucu bilgisini al
            server_url = f"https://{source_res.url.split('/')[2]}/server_lookup.php?channel_id=stream-{channel_id}"
            server_res = await self._session.get(server_url, headers=self._headers(source_url))
            server_key = server_res.json().get("server_key", "top1")

            # Final M3U8 linkini oluştur
            final_url = f"https://{server_key}new.newkso.ru/{server_key}/stream-{channel_id}/mono.m3u8"
            return final_url
        except Exception as e:
            print(f"Yayın çözülemedi: {e}")
            return None
