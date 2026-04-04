const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
    id: "org.orcun.daddylive",
    version: "1.0.0",
    name: "DaddyLive TR",
    description: "ABC, CBS ve daha fazlası.",
    resources: ["stream"],
    types: ["tv"],
    catalogs: [],
    idPrefixes: ["dlhd-"]
};

const builder = new addonBuilder(manifest);

builder.streamHandler(async (args) => {
    if (args.type === "tv" && args.id.startsWith("dlhd-")) {
        const channelId = args.id.replace("dlhd-", "");
        
        // Senin Kiwi'de bulduğun ana sunucu ve yol mantığı
        // Not: Bu kısım dinamik token çekmek için geliştirilebilir
        const streamUrl = `https://sec.ai-hls.site/proxy/top1/cdn/${channelId}/mono.css`;

        return Promise.resolve({
            streams: [
                {
                    title: "Canlı Yayın (Daddylive)",
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
        });
    }
    return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();
const { getRouter } = require("stremio-addon-sdk");
const express = require("express");
const app = express();
const router = getRouter(addonInterface);

app.use("/", router);
app.listen(process.env.PORT || 7000, () => {
    console.log("Addon is running!");
});
