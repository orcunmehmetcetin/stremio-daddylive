const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const { getRouter } = require("stremio-addon-sdk");
const puppeteer = require("puppeteer");

const manifest = {
    id: "org.orcun.daddylive",
    version: "2.0.0",
    name: "DaddyLive Puppeteer Sızma",
    description: "Network İzleme Modu - Artık HTML Değil Trafik Dinliyoruz",
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

// KATALOG VE META (Dokunulmadı)
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

builder.defineMetaHandler((args) => {
    const channels = { "dlhd-51": "ABC", "dlhd-52": "CBS", "dlhd-53": "NBC", "dlhd-54": "FOX" };
    return Promise.resolve({ meta: channels[args.id] ? { id: args.id, type: "tv", name: channels[args.id] } : null });
});

// YENİ STREAM HANDLER (Puppeteer Network Sniffer)
builder.defineStreamHandler(async (args) => {
    if (args.type === "tv" && args.id.startsWith("dlhd-")) {
        const channelId = args.id.replace("dlhd-", "");
        console.log(`--- [OPERASYON] ${channelId} için Görünmez Tarayıcı Başlatıldı ---`);

        let browser;
        try {
            // Render üzerinde Chrome çalıştırmak için gerekli ayarlar
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            
            // Gerçek bir tarayıcı gibi davranıyoruz
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({ 'Referer': 'https://daddylive.mp/' });

            let capturedUrl = null;

            // NETWORK DİNLEME: Trafikte .css veya .m3u8 geçen linkleri avla
            page.on('request', request => {
                const url = request.url();
                // Senin yakaladığın o 'mono.css' aslında m3u8'in ta kendisi
                if (url.includes('mono.css') || url.includes('.m3u8')) {
                    if (!capturedUrl) {
                        console.log(`[BİNGO] Trafikten yakalandı: ${url.substring(0, 60)}...`);
                        capturedUrl = url;
                    }
                }
            });

            // Sayfayı aç ve sızıntı olması için bekle (Max 15 sn)
            await page.goto(`https://embedkclx.sbs/embed.php?id=${channelId}`, { waitUntil: 'networkidle2', timeout: 20000 });
            
            // Eğer hala yakalanmadıysa biraz daha bekle
            if (!capturedUrl) {
                await new Promise(r => setTimeout(r, 5000));
            }

            await browser.close();

            if (capturedUrl) {
                return {
                    streams: [{
                        title: "Yüksek Kalite (Network Sniff)",
                        url: capturedUrl,
                        behaviorHints: {
                            notWebReady: true,
                            proxyHeaders: {
                                "request": {
                                    "Referer": "https://embedkclx.sbs/",
                                    "Origin": "https://embedkclx.sbs",
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                                }
                            }
                        }
                    }]
                };
            }

        } catch (error) {
            console.error(`[OPERASYON HATASI]:`, error.message);
            if (browser) await browser.close();
        }
    }
    return { streams: [] };
});

const app = express();
app.use("/", getRouter(builder.getInterface()));
const port = process.env.PORT || 7000;
app.listen(port, () => console.log(`Sızma Modu V2 Ready!`));
                
