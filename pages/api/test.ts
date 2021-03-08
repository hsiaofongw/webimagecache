// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp';

async function requestHandler(req: NextApiRequest, res: NextApiResponse) {
    
    const link = "https://exploro.one";
    const api = "http://localhost:3000/api/preview";
    let url = new URL(api);
    url.searchParams.append("link", link);
    
    const response = await fetch(url.toString())
    .then(d => d.arrayBuffer())
    .then(d => Buffer.from(d));

    res.setHeader("Content-Type", "image/webp");
    res.status(200).send(response);

}

export default requestHandler;
