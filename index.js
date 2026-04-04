const { addonBuilder } = require("stremio-addon-sdk");
const express = require("express");
const { getRouter } = require("stremio-addon-sdk");

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

// Hata veren kısım burasıydı, şimdi doğrusunu yazıyoruz:
builder.defineStreamHandler(async (args) => {
    if (args.type === "tv" && args.id.startsWith("dlhd-")) {
        const channelId = args.id.replace("dlhd-", "");
        
        // Senin yakaladığın o gizli mono.css yolu
        const streamUrl = `https://sec.ai-hls.site/proxy/top1/cdn/${channelId}/mono.css`;

        return {
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
        };
    }
    return { streams: [] };
});

const app = express();
const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

app.use("/", router);

const port = process.env.PORT || 7000;
app.listen(port, () => {
    console.log(`Addon is running on port ${port}`);
    console.log(`Manifest available at http://localhost:${port}/manifest.json`);
});
