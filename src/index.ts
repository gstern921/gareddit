import "reflect-metadata";
import path from "path";
require("dotenv").config({
  path: path.join(__dirname, "..", "src", "config", "config.env"),
});
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";

import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";

// import { Post } from "./entities/Post";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { MyContext, MyRequest } from "./types";
// import { User } from "./entities/User";

import {
  PORT,
  NODE_ENV,
  IS_PROD,
  SESSION_SECRET,
  SESSION_COOKIE_NAME,
  TIME_IN_MILLISECONDS,
  CLIENT_URL,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} from "./config/constants";
import { User } from "./entities/User";
import { Post } from "./entities/Post";

const main = async () => {
  // sendEmail("bob@bob.com", "hello there");

  await createConnection({
    type: "postgres",
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    logging: true,
    synchronize: !IS_PROD,
    entities: [User, Post],
  });

  const app = express();

  app.use(cors({ origin: CLIENT_URL, credentials: true }));
  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      secret: SESSION_SECRET!,
      resave: false,
      cookie: {
        maxAge: TIME_IN_MILLISECONDS.YEAR * 10,
        secure: IS_PROD,
        httpOnly: true,
        sameSite: "lax",
      },
      saveUninitialized: false,
    })
  );

  // console.log(SESSION_SECRET, redis, RedisStore);

  const schema = await buildSchema({
    resolvers: [HelloResolver, PostResolver, UserResolver],
    validate: false,
  });

  const context = ({
    req,
    res,
  }: {
    req: MyRequest;
    res: express.Response<any>;
    redis: Redis.Redis;
  }): MyContext => ({
    req,
    res,
    redis,
  });

  const apolloServer = new ApolloServer({
    schema,
    context,
  });
  apolloServer.applyMiddleware({ app, cors: false });
  app.get("/", (_, res) => {
    res.send("Hello world");
  });
  app.listen(PORT, () =>
    console.log(`App is running in ${NODE_ENV} mode on port ${PORT}`)
  );
};

main().catch((err) => {
  console.error(err);
});
