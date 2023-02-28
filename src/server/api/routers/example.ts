import type { User as ClerkUser } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { emojiValidator } from "~/shared/emojiValidator";

const filterUser = (user: ClerkUser) => {
  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
  };
};

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userIds = posts.map((post) => post.authorId);

    const users = await clerkClient.users
      .getUserList({ userId: userIds })
      .then((user) => user.map(filterUser));

    return posts.map((post) => ({
      ...post,
      user: users.find((user) => user.id === post.authorId)!,
    }));
  }),
  self: protectedProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),

  createPost: protectedProcedure
    .input(emojiValidator)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.create({
        data: {
          content: input.message,
          authorId: ctx.session.userId,
        },
      });

      return post;
    }),
});
