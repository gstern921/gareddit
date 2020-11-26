import { isAuth } from "../middleware/isAuth";
import {
  Arg,
  Mutation,
  Query,
  Resolver,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  Int,
} from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { getConnection } from "typeorm";
import {
  MAX_POSTS_QUERY_LIMIT,
  DEFAULT_POSTS_QUERY_LIMIT,
  MIN_POSTS_QUERY_LIMIT,
} from "../config/constants";

@InputType()
class PostInput {
  @Field()
  title!: string;
  @Field()
  text!: string;
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(
    @Arg("limit", () => Int, { defaultValue: DEFAULT_POSTS_QUERY_LIMIT })
    limit: number,
    @Arg("cursor", () => String, { defaultValue: Date.now().toString() })
    cursor: string | null
  ): Promise<Post[]> {
    let actualLimit = Math.min(limit, MAX_POSTS_QUERY_LIMIT);
    actualLimit = Math.max(actualLimit, MIN_POSTS_QUERY_LIMIT);
    let q = getConnection()
      .getRepository(Post)
      .createQueryBuilder("p")
      .take(actualLimit)
      .orderBy('"createdAt"', "DESC");

    if (cursor) {
      q = q.where('"createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }

    return q.getMany();
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    const post = await Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
    return post;
  }
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | undefined> {
    const post = await Post.findOne(id);
    if (!post) {
      return undefined;
    }
    if (typeof title !== "undefined") {
      await Post.update({ id }, { title });
    }
    return post;
  }
  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    try {
      const removedPost = await Post.delete({ id });
      return !!removedPost;
    } catch (_) {
      return false;
    }
  }
}
