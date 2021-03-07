// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import jwt, { VerifyOptions } from 'jsonwebtoken';
import { VerifyErrors } from 'jsonwebtoken';
import { v4 as uuidv4, v4 } from 'uuid';

const masterSecret = "shhh";

function getNow(): number {
    return Math.floor(Date.now()/1000);
}

interface ISession {
    sessionId: string;
    visitorId: string;
    startAt: number;
    lastActivity: number;

    isTooOld: () => boolean;

    extendLife: () => void;
}

class Session implements ISession {

    public sessionId: string;
    public visitorId: string;
    public startAt: number;
    public lastActivity: number;

    constructor(visitorId: string) {
        this.sessionId = v4();
        this.visitorId = visitorId;
        this.startAt = getNow();
        this.lastActivity = this.startAt;
    }

    isTooOld(): boolean {
        const FRESH_TOLERANCE = 120;
        const now = getNow();
        const sessionAge = now - this.lastActivity;

        return sessionAge > FRESH_TOLERANCE;
    }

    extendLife(): void {
        this.lastActivity = getNow();
    }

}

interface IVisitor {
    visitorId: string;
    currentSessions: ISession[];
    sessionHistories: ISession[];
}

class Visitor implements IVisitor {

    public visitorId: string;
    public currentSessions: ISession[];
    public sessionHistories: ISession[];

    constructor() {
        this.visitorId = v4();
        this.currentSessions = [];
        this.sessionHistories = [];
    }

    createNewSession() {
        const session = new Session(this.visitorId);
        this.currentSessions.push(session);
    }

    extendSessionLife(sessionId: string): boolean {
        for (const session of this.currentSessions) {
            if (session.sessionId === sessionId) {
                session.extendLife();
                return true;
            }
        }
        
        return false;
    }

    expireAllOutdatedSessions(): void {
        let activeSessions: ISession[] = [];
        for (const session of this.currentSessions) {
            if (session.isTooOld()) {
                this.sessionHistories.push(session);
            }
            else {
                activeSessions.push(session);
            }
        }

        this.currentSessions = activeSessions;
    }

}

interface IResponseData {
    jwt: string;
}

interface IPayload {
    visitorId: string;
    sessionId: string;
}

export default (req: NextApiRequest, res: NextApiResponse<IResponseData>) => {

    // const body = req.body;

    // const verifyOptions: VerifyOptions = {
    //     ignoreExpiration: true,
    //     ignoreNotBefore: true
    // };

    // jwt.verify(
    //     body.jwt, 
    //     masterSecret, 
    //     verifyOptions,
    //     function(err: VerifyErrors | null, decoded: object | undefined) {
    //         if (err) {
    //             if (err.name === 'JsonWebTokenError') {
    //                 let visitor = new Visitor();
    //                 visitor.createNewSession();
    //             }
    //         }
    //     }
    // )


    res.status(200).json({ jwt: 'John Doe' })
}