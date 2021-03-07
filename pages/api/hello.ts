// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import jwt, { VerifyOptions } from 'jsonwebtoken';
import { VerifyErrors } from 'jsonwebtoken';
import { v4 as uuidv4, v4 } from 'uuid';
import { MongoClient } from 'mongodb';

const masterSecret = "shhh";
const mongoDBConnectionString = "mongodb+srv://online:<password>@cluster0.ky1q0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

function getNow(): number {
    return Math.floor(Date.now()/1000);
}

function getDBPassword(): string {
    if ("DB_PWD" in process.env) {
        return process.env["DB_PWD"] || "nopasswordinenv";
    }
    else {
        return "nopasswordinenv";
    }
}

interface ISession {
    sessionId: string;
    visitorId: string;
    startAt: number;
    lastActivity: number;
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

    toObject(): object {
        return {
            "sessionId": this.sessionId,
            "visitorId": this.visitorId,
            "startAt": this.startAt,
            "lastActivity": this.lastActivity
        };
    }

    static fromObject(s: ISession): Session {
        let session = new Session('');
        session.sessionId = s.sessionId;
        session.visitorId = s.visitorId;
        session.startAt = s.startAt;
        session.lastActivity = s.lastActivity;

        return session;
    }

}

interface IVisitor {
    visitorId: string;
    currentSessions: Session[];
    sessionHistories: Session[];
}

class Visitor implements IVisitor {

    public visitorId: string;
    public currentSessions: Session[];
    public sessionHistories: Session[];

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
        let activeSessions: Session[] = [];
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

    toObject(): object {
        return {
            "visitorId": this.visitorId,
            "currentSessions": this.currentSessions.map(s => s.toObject()),
            "sessionHistories": this.sessionHistories.map(s => s.toObject())
        };
    }

    static fromObject(v: { 
        visitorId: string, 
        currentSessions: ISession[], 
        sessionHistories: ISession[]}
    ): Visitor {
        let visitor = new Visitor();
        visitor.visitorId = v.visitorId;
        visitor.currentSessions = v.currentSessions.map(s => Session.fromObject(s));
        visitor.sessionHistories = v.sessionHistories.map(s => Session.fromObject(s));

        return visitor;
    }

}

interface IResponseData {
    jwt: string;
}

interface IPayload {
    visitorId: string;
    sessionId: string;
}

async function findVisitor(visitorId: string): Promise<Visitor | undefined>  {
    const connStr = mongoDBConnectionString.replace("<password>", getDBPassword());
    const client = new MongoClient(connStr, { useUnifiedTopology: true });

    try {
        // Connect the client to the server
        await client.connect();
        // Establish and verify connection
        const database = client.db("online");
        const visitors = database.collection("visitors");
        
        const query = {
            visitorId
        };

        const visitor = await visitors.findOne(query);

        if (visitor) {
            return Visitor.fromObject(visitor);
        }
    }
    finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

async function addVisitor(visitor: Visitor): Promise<boolean | undefined>  {
    const connStr = mongoDBConnectionString.replace("<password>", getDBPassword());
    const client = new MongoClient(connStr, { useUnifiedTopology: true });

    try {
        // Connect the client to the server
        await client.connect();
        // Establish and verify connection
        const database = client.db("online");
        const visitors = database.collection("visitors");
        
        const data = visitor.toObject();
        const result = await visitors.insertOne(data);

        console.log(`${result.insertedCount} visitor inserted, insertedId: ${result.insertedId}, visitorId: ${visitor.visitorId}`);

        if (result.insertedCount) {
            return true;
        }
    }
    finally {
        await client.close();
    }
}

async function requestHandler(req: NextApiRequest, res: NextApiResponse<IResponseData>) {


    let v1 = new Visitor();
    let v2 = new Visitor();
    v1.createNewSession();
    v1.createNewSession()
    v2.createNewSession();
    v2.createNewSession();
    v2.createNewSession();
    await addVisitor(v1);
    await addVisitor(v2);

    let d1 = await findVisitor(v1.visitorId);
    let d2 = await findVisitor(v2.visitorId);

    console.log(d1);
    console.log(d2);

    res.status(200).json({ jwt: 'John Doe' })

}

export default requestHandler;

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

// }