const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const { getRouter } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    id: "org.orcun.daddylive",
    version: "1.1.0",
    name: "DaddyLive TR (Dinamik)",
    description: "ABC, CBS, NBC ve FOX - Her zaman güncel linkler.",
    resources: ["stream", "catalog", "meta"],
    types: ["tv"],
    catalogs: [
        {
            type: "tv",
            id: "daddylive_channels",
            name: "DaddyLive Canlı TV"
        }
    ],
    idPrefixes: ["dlhd-"]
};

const builder = new addonBuilder(manifest);

// 1. KATALOG (Kanal Listesi - NBC ve FOX eklendi)
builder.defineCatalogHandler((args) => {
    if (args.id === "daddylive_channels") {
        return Promise.resolve({
            metas: [
                { id: "dlhd-51", type: "tv", name: "ABC", poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/ABC_logo_2021.svg/512px-ABC_logo_2021.svg.png" },
                { id: "dlhd-52", type: "tv", name: "CBS", poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/CBS_logo.svg/512px-CBS_logo.svg.png" },
                { id: "dlhd-53", type: "tv", name: "NBC", poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/NBC_logo_2022.svg/512px-NBC_logo_2022.svg.png" },
                { id: "dlhd-54", type: "tv", name: "FOX", poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Fox_logo_2023.svg/512px-Fox_logo_2023.svg.png" }
            ]
        });
    }
    return Promise.resolve({ metas: [] });
});

// 2. META HANDLER
builder.defineMetaHandler((args) => {
    const channels = {
        "dlhd-51": "ABC", "dlhd-52": "CBS", "dlhd-53": "NBC", "dlhd-54": "FOX"
    };
    if (channels[args.id]) {
        return Promise.resolve({ meta: { id: args.id, type: "tv", name: channels[args.id] } });
    }
    return Promise.resolve({ meta: null });
});

// 3. STREAM HANDLER (Dinamik Token Alıcı Eklenen Bölüm)
builder.defineStreamHandler(async (args) => {
    if (args.type === "tv" && args.id.startsWith("dlhd-")) {
        const channelId = args.id.replace("dlhd-", "");
        
        try {
            // Arka planda embed sayfasına gidip token alıyoruz
            const response = await axios.get(`https://embedkclx.sbs/embed.php?id=${channelId}`, {
                headers: {
                    'Referer': 'https://daddylive.mp/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // HTML içinden "token" ve "server" bilgisini ayıklıyoruz
            const html = response.data;
            const tokenMatch = html.match(/token=([a-zA-Z0-9._-]+)/);
            
            // Eğer taze token bulamazsak eski usul (ama taze header ile) dene
            const streamUrl = `https://sec.ai-hls.site/proxy/top1/cdn/${channelId}/mono.css${tokenMatch ? '?token=' + tokenMatch[1] : ''}`;

            return {
                streams: [
                    {
                        title: "Canlı Yayın (Dinamik)",
                        url: streamUrl,
                        behaviorHints: {
                            notWebReady: true,
                            proxyHeaders: {
                                "request": {
                                    "Referer": "https://embedkclx.sbs/",
                                    "Origin": "https://embedkclx.sbs",
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
                                }
                            }
                        }
                    }
                ]
            };
        } catch (error) {
            console.error("Link alınamadı:", error);
            return { streams: [] };
        }
    }
    return { streams: [] };
});

const app = express();
app.use("/", getRouter(builder.getInterface()));
const port = process.env.PORT || 7000;
app.listen(port, () => console.log(`Eklenti ${port} portunda hazır!`));
