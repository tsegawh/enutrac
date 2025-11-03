import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        const email = profile.emails?.[0].value;
        const name = profile.displayName;

        if (!email) return done(new Error("No email returned from Google"));

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              name,
              password: "", // Not needed for Google
              role: "USER",
            },
          });

          // Assign free plan automatically
          const freePlan = await prisma.subscriptionPlan.findFirst({
            where: { name: "Free" },
          });

          if (freePlan) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + freePlan.durationDays);
            await prisma.subscription.create({
              data: {
                userId: user.id,
                planId: freePlan.id,
                endDate,
              },
            });
          }
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
          expiresIn: "7d",
        });

        done(null, { token, user });
      } catch (error) {
        done(error, false);
      }
    }
  )
);

export default passport;
