// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp';

async function requestHandler(req: NextApiRequest, res: NextApiResponse) {
    const link = req.query["link"] as string;

    console.log(`link: ${link}`);

    const previewWidth = 60;
    const previewHeight = 60;

    await fetch(link)
    .then(blob => {
        console.log(`link: ${link}, Got response.`);
        return blob.arrayBuffer();
    })
    .then(arrayBuffer => {
        console.log(`link: ${link}, Got arrayBuffer.`);
        return Buffer.from(arrayBuffer);
    })
    .then(buffer => {
        console.log(`link: ${link}, Got buffer, start sharping...`);
        return sharp(buffer);
    })
    .then(s => {
        console.log(`link: ${link}, Resizing...`);
        return s.resize(previewWidth, previewHeight);
    })
    .then(s => {
        console.log(`link: ${link}, Converting to webp...`);
        return s.webp();
    })
    .then(s => {
        console.log(`link: ${link}, Converting to Buffer...`);
        return s.toBuffer();
    })
    .then(buf => {
        console.log(`link: ${link}, Returning...`);

        const cacheDays = 3;
        const cacheSeconds = 60 * 60 * 24 * cacheDays;

        res.setHeader("Cache-Control", `public,max-age=${cacheSeconds}`);
        res.setHeader("Content-Type", "image/webp");
        res.status(200).send(buf);
    })
    .catch(e => {
        console.log(`link: ${link}, There are error(s):`);
        console.log(e);
        res.status(500).json({
            "msg": "Internal Error",
            "detail": `${e}`
        });
    });
}

export default requestHandler;
