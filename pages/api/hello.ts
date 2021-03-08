// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from 'next'
import jwt, { VerifyOptions } from 'jsonwebtoken';
import { VerifyErrors, VerifyCallback } from 'jsonwebtoken';
import { v4 as uuidv4, v4 } from 'uuid';
import { Db, MongoClient } from 'mongodb';
import { promisify } from 'util';

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

    createNewSession(): string {
        const session = new Session(this.visitorId);
        this.currentSessions.push(session);
        return session.sessionId;
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

/**
 * 返回给客户端内容的格式的约定．
 */
interface IResponseData {
    jwt: string;
    msg?: string;
    renewed?: boolean;
}

interface IRequestBody {
    jwt: string;
}

class RequestBody implements IRequestBody {
    public jwt: string;

    constructor({ jwt }: IRequestBody) {
        this.jwt = jwt;
    }
}

/**
 * 服务器和客户端以 JWT 的方式通信，这是 payload 所应满足的最基本要求．
 */
interface IPayload {
    visitorId: string;
    sessionId: string;
}

class Payload implements IPayload {
    public visitorId: string;
    public sessionId: string;

    constructor({ visitorId, sessionId }: IPayload) {
        this.visitorId = visitorId;
        this.sessionId = sessionId;
    }
}

async function getDatabase(): Promise<Db> {
    const connStr = mongoDBConnectionString.replace("<password>", getDBPassword());
    const client = new MongoClient(connStr, { useUnifiedTopology: true });
    const dbName = "online";

    try {
        await client.connect();

        const database = client.db("online");
        return database;
    }
    finally {
        await client.close();
    }
    
}

/**
 * 为新访客注册一个身份(Visitor)，并且返回对应的 jwt ．
 */
async function assignNewId(): Promise<string> {
    let visitor = new Visitor;

    const visitorId = visitor.visitorId;
    const sessionId = visitor.createNewSession();

    const payload: IPayload = {
        visitorId, sessionId
    };

    const newJWTString = jwt.sign(
        payload, masterSecret
    );

    return await getDatabase()
    .then(db => db.collection("visitors"))
    .then(collection => collection.insertOne(visitor))
    .then(d => {
        if (d.insertedCount) {
            return newJWTString;
        }
        else {
            return Promise.reject("Can't persist visitor into DB.")
        }
    });
}

/**
 * 查找访客 Visitor 信息
 * @param visitorId Visitor 的唯一标识符 
 */
async function findVisitor(visitorId: string): Promise<Visitor | undefined> {
    const visitor = await getDatabase()
    .then(db => db.collection("visitors"))
    .then(collection => collection.findOne<Visitor>({ visitorId }));

    if (visitor instanceof Visitor) {
        return visitor;
    }
}

/**
 * 延迟会话时长
 */
async function extendLife(visitor: Visitor, sessionId: string) {

    visitor.expireAllOutdatedSessions();
    const result = visitor.extendSessionLife(sessionId);

    return result
}

/**
 * 使更改与数据库中的数据同步
 * @param visitor 访客
 */
async function updateVisitor(visitor: Visitor) {
    const query = {
        visitorId: visitor.visitorId
    };

    const result = await getDatabase()
    .then(db => db.collection("visitors"))
    .then(collection => collection.findOneAndReplace(
        query, visitor
    ));

    return result.ok;
}

async function dealWithInvalidJWT(req: NextApiRequest, res: NextApiResponse<IResponseData>) {
    console.log(req);
    console.log("Invalid JWT.");
    const jwtStringPerhaps = await assignNewId();

    if (jwtStringPerhaps) {
        res.status(200).json({ jwt: `${jwtStringPerhaps}`});
    }
    else {
        res.status(500).json({ jwt: "", msg: "Internal Error" });
    }
}

async function requestHandler(req: NextApiRequest, res: NextApiResponse<IResponseData>) {

    if (req.body instanceof RequestBody) {
        const body = req.body;

        const verifyOptions: VerifyOptions = {
            ignoreExpiration: true,
            ignoreNotBefore: true
        };

        const verify = promisify(
            (cb: VerifyCallback) => jwt.verify(body.jwt, masterSecret, verifyOptions, cb)
        );

        verify().then(d => {
            if (d instanceof Payload) {
                return Promise.resolve(d);
            }
            else {
                return Promise.reject();
            }
        }).then(d => Promise.all([findVisitor(d.visitorId), d.sessionId]))
        .then(vs => {
            if (vs[0] instanceof Visitor) {
                return Promise.all([vs[0], vs[1]])
            }
            else {
                return Promise.reject();
            }
        }).then(vs => {
            let visitor = vs[0];
            let sessionId = vs[1];

            visitor.expireAllOutdatedSessions();
            const result = visitor.extendSessionLife(sessionId);

            if (result) {
                return visitor;
            }
            else {
                return Promise.reject();
            }
        }).then(v => addVisitor(v))
    }



    if ("jwt" in body) {
        const jwtString = body.jwt;

        

        let verifyCallback = async (err: VerifyErrors | null, decoded: object | undefined) => {
            if (decoded instanceof Payload) {
                const visitorId = decoded.visitorId;
                const sessionId = decoded.sessionId;

                const visitor = await findVisitor(visitorId);
                if (visitor instanceof Visitor) {
                    visitor.expireAllOutdatedSessions();
                    const result = visitor.extendSessionLife(sessionId);

                    if (result) {
                        res.status(200).json({
                            "jwt": jwtString,
                            renewed: true
                        });
                    }
                }
            }
        };

        

        verify().then(x => {
            if (x instanceof Payload) {
                return [findVisitor(x.visitorId), x.sessionId]
            }
            else {
                return Promise.reject()
            }
        }).then(d => {

        });


    }
}

export default requestHandler;

    // const body = req.body;

    

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