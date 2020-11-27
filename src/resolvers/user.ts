import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { getConnection } from "typeorm";
import argon2 from "argon2";
import { v4 as uuidV4 } from "uuid";
import { MyContext } from "../types";
import { User } from "../entities/User";
import {
  SESSION_COOKIE_NAME,
  CLIENT_URL,
  CHANGE_PASSWORD_PATH,
} from "../config/constants";
import { UserInfoInput } from "./UserInfoInput";
import getRegisterValidationErrors from "../utils/getRegisterValidationErrors";
import getUserPasswordValidationErrors from "../utils/getUserPasswordValidationErrors";
import sendEmail from "../utils/sendEmail";
import {
  REDIS_FORGET_PASSWORD_KEY_PREFIX,
  FORGET_PASSWORD_TOKEN_EXPIRATION_TIME,
} from "../config/constants";

@ObjectType()
export class FieldError {
  @Field(() => String)
  field!: string;
  @Field(() => String)
  message!: string;
}

@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      // this is the current user and it is ok to show them their own email
      return user.email;
    }
    // The current user wants to see someone else's email
    return "";
  }

  @Query(() => User, { nullable: true })
  user(@Arg("id") id: number): Promise<User | undefined> {
    return User.findOne(id);
  }

  @Query(() => [User])
  users(): Promise<User[]> {
    return User.find();
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }
    const user = User.findOne(req.session.userId);
    return user ? user : null;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UserInfoInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    if (req.session.userId) {
      return {
        errors: [{ field: "username", message: "You are already logged in." }],
      };
    }

    const errors = getRegisterValidationErrors({
      username: { value: options.username, fieldName: "username" },
      password: { value: options.password, fieldName: "password" },
      email: { value: options.email, fieldName: "email" },
    });
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          password: hashedPassword,
          email: options.email,
        })
        .returning("*")
        .execute();

      user = result.raw[0];
    } catch (err) {
      if (err.code === "23505") {
        return {
          errors: [{ field: "username", message: "Username already taken." }],
        };
      }

      return {
        errors: [{ field: "username", message: "Something went wrong." }],
      };
    }
    req.session.userId = user.id;
    if (!user) {
      return {
        errors: [{ field: "username", message: "Something went wrong." }],
      };
    }
    return { user };
  }
  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail", () => String) usernameOrEmail: string,
    @Arg("password", () => String) password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    if (req.session.userId) {
      return {
        errors: [
          { field: "usernameOrEmail", message: "You are already logged in." },
        ],
      };
    }

    const isEmail = usernameOrEmail.includes("@");
    const user = await User.findOne(
      isEmail
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "Invalid username or password.",
          },
        ],
      };
    }
    const match = await argon2.verify(user.password, password);
    if (!match) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "Invalid username or password.",
          },
        ],
      };
    }

    // Successful Login
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<boolean> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return false;
    }

    const resetToken = uuidV4();

    await redis.set(
      `${REDIS_FORGET_PASSWORD_KEY_PREFIX}${resetToken}`,
      user.id,
      "ex",
      FORGET_PASSWORD_TOKEN_EXPIRATION_TIME
    );

    const emailHtml = `<a href="${CLIENT_URL}${CHANGE_PASSWORD_PATH}/${resetToken}">Reset your password</a>`;

    await sendEmail(email, emailHtml);

    return true;
  }

  @Mutation(() => UserResponse, { nullable: true })
  async changePassword(
    @Arg("token", () => String) token: string,
    @Arg("newPassword", () => String) newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse | undefined> {
    const redisKeyName = `${REDIS_FORGET_PASSWORD_KEY_PREFIX}${token}`;
    const userId = await redis.get(redisKeyName);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "Token expired." }],
      };
    }
    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists.",
          },
        ],
      };
    }

    const passwordErrors = getUserPasswordValidationErrors(
      newPassword,
      "newPassword"
    );

    if (passwordErrors) {
      return {
        errors: passwordErrors,
      };
    }

    const hashedPassword = await argon2.hash(newPassword);

    await User.update({ id: userIdNum }, { password: hashedPassword });

    await redis.del(redisKeyName);

    // Log in user
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async deleteUser(@Arg("id") id: number): Promise<boolean> {
    try {
      const removedUser = await User.delete({ id });
      return !!removedUser;
    } catch (_) {
      return false;
    }
  }
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) => {
      req.session.destroy((e) => {
        res.clearCookie(SESSION_COOKIE_NAME);
        if (e) {
          resolve(false);
        }
        resolve(true);
      });
    });
  }
}
