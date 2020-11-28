import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Redis } from "ioredis";
import { createUserLoader } from "./utils/createUserLoader";

export type MyRequest = Request & {
  session: Session & Partial<SessionData> & { userId: number };
};

export type MyContext = {
  req: MyRequest;
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
};
