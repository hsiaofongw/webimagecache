// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'


async function requestHandler(req: NextApiRequest, res: NextApiResponse) {
    
    const link = "https://exploro.one";
    const api = "https://websitepreview-git-main-hsiaofongw.vercel.app/api/preview";
    let url = new URL(api);
    url.searchParams.append("link", link);
    
    const response = await fetch(url.toString())
    .then(d => d.arrayBuffer())
    .then(d => Buffer.from(d));

    res.setHeader("Content-Type", "image/webp");
    res.status(200).send(response);

}

export default requestHandler;
