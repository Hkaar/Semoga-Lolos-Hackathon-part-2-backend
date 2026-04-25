import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";

import bcrypt from "bcrypt";

import { Company } from "@/src/models/Company";

const SALT_ROUNDS = 10;

export const companyAuthRoutes = new Elysia({
  prefix: "/api/v1/company/auth",
})
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "change-this-secret",
      exp: "7d",
    }),
  )

  .post(
    "/register",
    async ({ body, set }) => {
      const {
        name,
        npwp,
        nib,
        address,
        email,
        password,
        targetCategory,
        csrRegion,
        annualTargetVolume,
        annualTargetUnit,
        picName,
        picTitle,
        phone,
        subscriptionPlan,
        paymentMethod,
      } = body;

      const exists = await Company.findOne({
        $or: [{ name }, { email }, { npwp }, { nib }],
      });
      if (exists) {
        set.status = 409;
        const field =
          exists.name === name
            ? "Company name"
            : exists.email === email.toLowerCase()
              ? "Email"
              : exists.npwp === npwp
                ? "NPWP"
                : "NIB";
        return { success: false, message: `${field} already in use.` };
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const company = await Company.create({
        name,
        npwp,
        nib,
        address,
        email,
        password: hashedPassword,
        targetCategory,
        csrRegion,
        annualTargetVolume,
        annualTargetUnit,
        picName,
        picTitle,
        phone,
        subscriptionPlan,
        paymentMethod,
      });

      return {
        success: true,
        message: "Company registered.",
        data: {
          id: company._id,
          name: company.name,
          email: company.email,
          subscriptionPlan: company.subscriptionPlan,
          totalImpactAcquired: company.totalImpactAcquired,
        },
      };
    },
    {
      body: t.Object({
        name: t.String(),
        npwp: t.String(),
        nib: t.String(),
        address: t.String(),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        targetCategory: t.String(),
        csrRegion: t.String(),
        annualTargetVolume: t.Number({ minimum: 0 }),
        annualTargetUnit: t.String({ default: "Ton" }),
        picName: t.String(),
        picTitle: t.String(),
        phone: t.String(),
        subscriptionPlan: t.Union([
          t.Literal("lite"),
          t.Literal("pro"),
          t.Literal("enterprise"),
        ]),
        paymentMethod: t.String(),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const { identifier, password } = body;

      // Match by name OR email
      const company = await Company.findOne({
        $or: [{ name: identifier }, { email: identifier.toLowerCase() }],
      });

      if (!company) {
        set.status = 404;
        return { success: false, message: "Company not found." };
      }

      const valid = await bcrypt.compare(password, company.password);
      if (!valid) {
        set.status = 401;
        return { success: false, message: "Invalid password." };
      }

      const token = await jwt.sign({
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        targetCategory: company.targetCategory,
      });

      return {
        success: true,
        message: "Login successful.",
        token,
        data: {
          id: company._id,
          name: company.name,
          email: company.email,
          targetCategory: company.targetCategory,
          totalImpactAcquired: company.totalImpactAcquired,
        },
      };
    },
    {
      body: t.Object({
        identifier: t.String(), // name or email
        password: t.String(),
      }),
    },
  );
