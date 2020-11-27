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
  FieldResolver,
  Root,
} from "type-graphql";
import { Post } from "../entities/Post";
import { Updoot } from "../entities/Updoot";
import { MyContext } from "../types";
import { getConnection } from "typeorm";
import { ObjectType } from "type-graphql";
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

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.substring(0, 50);
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int, { defaultValue: DEFAULT_POSTS_QUERY_LIMIT })
    limit: number,
    @Arg("cursor", () => String, { nullable: true })
    cursor: string | null
  ): Promise<PaginatedPosts> {
    let actualLimit = Math.min(limit, MAX_POSTS_QUERY_LIMIT);
    actualLimit = Math.max(actualLimit, MIN_POSTS_QUERY_LIMIT);
    const actualLimitPlusOne = actualLimit + 1;

    // const replacements: any[] = [actualLimitPlusOne];

    // if (cursor) {
    //   replacements.push(new Date(cursor));
    // }

    //   let query = getConnection().query(
    //     `
    //   SELECT p.* FROM post p
    //   json_build_object(
    //     'id', u.id
    //     'username', u.username,
    //     'email', u.email,
    //     ) creator
    //   INNER JOIN public.user u ON p."creatorId" = u.id
    //   ${cursor ? `WHERE p."createdAt" < $2` : ``}
    //   ORDER BY p."createdAt" DESC LIMIT $1
    // `,
    //     replacements
    //   );

    let q = getConnection()
      .getRepository(Post)
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.creator", "user")
      .orderBy('post."createdAt"', "DESC")
      .limit(actualLimitPlusOne);

    if (cursor) {
      q = q.where('post."createdAt" < :cursor', {
        cursor: new Date(cursor),
      });
    }

    const posts = await q.getMany();
    // console.log(posts.length);

    return {
      posts: posts.slice(0, actualLimit),
      hasMore: posts.length === actualLimitPlusOne,
    };
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
    console.log(input);
    const post = await Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
    return post;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const isUpdoot = value > 0;
    const voteValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;
    try {
      await getConnection().transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.increment(
          Post,
          { id: postId },
          "points",
          voteValue
        );
        await transactionalEntityManager.insert(Updoot, {
          userId,
          postId,
          value: voteValue,
        });
      });
    } catch (e) {
      return false;
    }
    return true;
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
