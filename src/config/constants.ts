const SECOND: number = 1000;
const MINUTE: number = SECOND * 60;
const HOUR: number = MINUTE * 60;
const DAY: number = HOUR * 24;
const YEAR: number = DAY * 365;
export const TIME_IN_MILLISECONDS: {
  SECOND: number;
  MINUTE: number;
  HOUR: number;
  DAY: number;
  YEAR: number;
} = {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  YEAR,
};

export const NODE_ENV: string = process.env.NODE_ENV || "development";
export const IS_PROD: boolean = NODE_ENV === "production";
export const SESSION_COOKIE_NAME: string = "qid";
export const CLIENT_URL: string = "https://gareddit-client.herokuapp.com/";
export const CHANGE_PASSWORD_PATH: string = "/change-password";
export const REDIS_FORGET_PASSWORD_KEY_PREFIX: string = "forget-password:";
export const FORGET_PASSWORD_TOKEN_EXPIRATION_TIME: number =
  TIME_IN_MILLISECONDS.DAY * 3;

export const DEFAULT_USERNAME_FIELDNAME = "username";
export const DEFAULT_USER_PASSWORD_FIELDNAME = "password";
export const DEFAULT_USER_EMAIL_ADDRESS_FIELDNAME = "email";

export const MAX_POSTS_QUERY_LIMIT = 50;
export const MIN_POSTS_QUERY_LIMIT = 1;
export const DEFAULT_POSTS_QUERY_LIMIT = 5;

export const {
  SESSION_SECRET,
  PORT,
  DB_USER,
  DB_NAME,
  DB_PASSWORD,
} = process.env;

export const MINIMUM_USERNAME_LENGTH = 3;
export const MINIMUM_PASSWORD_LENGTH = 4;
