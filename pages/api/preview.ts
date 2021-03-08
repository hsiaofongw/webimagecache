// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp';

async function requestHandler(req: NextApiRequest, res: NextApiResponse) {
    const link = req.query["link"] as string;

    console.log(`link: ${link}`);

    const encodedLink = encodeURIComponent(link);
    const apiEndPoint = "https://render-tron.appspot.com/screenshot/";
    const requestURI = `${apiEndPoint}${encodedLink}`;
    const url = new URL(requestURI);

    const viewPortWidth = 1440;
    const viewPortHeight = 960;
    url.searchParams.append("width", `${viewPortWidth}`);
    url.searchParams.append("height", `${viewPortHeight}`);

    console.log(`sent to rendertron: ${url.toString()}`);

    const previewWidth = 600;

    await fetch(url.toString())
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
        return s.resize(previewWidth);
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
