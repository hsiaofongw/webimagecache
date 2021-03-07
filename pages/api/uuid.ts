// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4, v4 } from 'uuid';

type UUIDData = {
    uuid: string;
}

export default (req: NextApiRequest, res: NextApiResponse<UUIDData>) => {
    res.status(200).json({ uuid: v4() });
}