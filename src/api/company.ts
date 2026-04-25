import { Elysia, t } from "elysia";
import { Company } from "@/src/models/Company";
import {
  companyJwtMiddleware,
  type CompanyJwtPayload,
} from "@/src/middleware/company-auth";

export const companyProfileRoutes = new Elysia({
  prefix: "/api/v1/company/profile",
})
  .use(companyJwtMiddleware)

  .get("/", async ({ company, set }) => {
    const data = await Company.findById(company.id).select("-password");
    if (!data) {
      set.status = 404;
      return { success: false, message: "Company not found." };
    }
    return { success: true, data };
  })

  .patch(
    "/",
    async ({ company, body, set }) => {
      const updated = await Company.findByIdAndUpdate(
        company.id,
        { $set: body },
        { new: true, runValidators: true },
      ).select("-password");

      if (!updated) {
        set.status = 404;
        return { success: false, message: "Company not found." };
      }

      return { success: true, message: "Profile updated.", data: updated };
    },
    {
      body: t.Partial(
        t.Object({
          address: t.String(),
          industrySector: t.String(),
          logoUrl: t.String(),
          targetCategories: t.Array(t.String()),
          csrRegion: t.String(),
          annualTargetVolume: t.Number({ minimum: 0 }),
          annualTargetUnit: t.String(),
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
      ),
    },
  )

  .post(
    "/topup",
    async ({ company, body, set }) => {
      const updated = await Company.findByIdAndUpdate(
        company.id,
        { $inc: { csrBalance: body.amount } },
        { new: true },
      ).select("csrBalance name");

      if (!updated) {
        set.status = 404;
        return { success: false, message: "Company not found." };
      }

      return { success: true, message: "Top up successful.", data: updated };
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 1 }),
      }),
    },
  );
