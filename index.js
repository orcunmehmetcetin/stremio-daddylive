const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const { getRouter } = require("stremio-addon-sdk");

const manifest = {
    id: "org.orcun.daddylive",
    version: "1.0.0",
    name: "DaddyLive TR",
    description: "ABC, CBS ve Popüler Kanallar",
    resources: ["stream", "catalog", "meta"], // Katalog ve Meta eklendi
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

// 1. KATALOG TANIMLAMA (Kanallar burada listelenir)
builder.defineCatalogHandler((args) => {
    if (args.id === "daddylive_channels") {
        return Promise.resolve({
            metas: [
                {
                    id: "dlhd-51",
                    type: "tv",
                    name: "ABC (Channel 51)",
                    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/ABC_logo_2021.svg/512px-ABC_logo_2021.svg.png",
                    description: "DaddyLive üzerinden ABC canlı yayını"
                },
                {
                    id: "dlhd-52",
                    type: "tv",
                    name: "CBS (Channel 52)",
                    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/CBS_logo.svg/512px-CBS_logo.svg.png",
                    description: "DaddyLive üzerinden CBS canlı yayını"
                }
            ]
        });
    }
    return Promise.resolve({ metas: [] });
});

// 2. META HANDLER (Kanal detayları)
builder.defineMetaHandler((args) => {
    if (args.id === "dlhd-51") {
        return Promise.resolve({ meta: { id: "dlhd-51", type: "tv", name: "ABC" } });
    }
    if (args.id === "dlhd-52") {
        return Promise.resolve({ meta: { id: "dlhd-52", type: "tv", name: "CBS" } });
    }
    return Promise.resolve({ meta: null });
});

// 3. STREAM HANDLER (Yayın linkini verme - Burası aynı kalıyor)
builder.defineStreamHandler(async (args) => {
    if (args.type === "tv" && args.id.startsWith("dlhd-")) {
        const channelId = args.id.replace("dlhd-", "");
        const streamUrl = `https://sec.ai-hls.site/proxy/top1/cdn/${channelId}/mono.css`;

        return {
            streams: [
                {
                    title: "Canlı Yayın",
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
    }
    return { streams: [] };
});

const app = express();
const router = getRouter(builder.getInterface());
app.use("/", router);
app.listen(process.env.PORT || 7000);
