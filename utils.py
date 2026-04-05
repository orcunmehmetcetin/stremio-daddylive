import os
import re
import base64
import json

# Sabit bir anahtar kullanıyoruz ki linkler sunucu kapansa da değişmesin
KEY_BYTES = b'stremio_daddylive_key_2026_special_fixed_value_64bytes_length!!'

def encrypt(input_string: str):
    input_bytes = input_string.encode()
    result = xor(input_bytes)
    return base64.urlsafe_b64encode(result).decode().rstrip('=')

def decrypt(input_string: str):
    padding_needed = 4 - (len(input_string) % 4)
    if padding_needed:
        input_string += '=' * padding_needed
    input_bytes = base64.urlsafe_b64decode(input_string)
    result = xor(input_bytes)
    return result.decode()

def xor(input_bytes):
    return bytes([input_bytes[i] ^ KEY_BYTES[i % len(KEY_BYTES)] for i in range(len(input_bytes))])

def urlsafe_base64(input_string: str) -> str:
    input_bytes = input_string.encode("utf-8")
    return base64.urlsafe_b64encode(input_bytes).decode("utf-8")

def decode_bundle(response_text: str) -> dict:
    # Bu fonksiyon Daddylive'ın güvenlik paketlerini ayıklar
    candidates = set()
    candidates.update(re.findall(r'JSON\.parse\s*\(\s*atob\s*\(\s*["\']([^"\']{40,})["\']\s*\)\s*\)', response_text))
    candidates.update(re.findall(r'atob\s*\(\s*["\'](eyJ[A-Za-z0-9+/=]{40,})["\']\s*\)', response_text))
    
    for candidate in candidates:
        try:
            decoded_candidate = base64.b64decode(candidate).decode("utf-8")
            data = json.loads(decoded_candidate)
            # Daddylive için gerekli olan anahtarlar
            if not all(key in data for key in ['b_ts', 'b_sig', 'b_rnd', 'b_host']):
                continue
            return data
        except:
            continue
    return {}
