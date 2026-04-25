import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';

import bcrypt from 'bcrypt';

import { Company } from '@/src/models/Company';

const SALT_ROUNDS = 10;

export const companyAuthRoutes = new Elysia({ prefix: '/api/v1/company/auth' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'change-this-secret',
            exp: '7d',
        })
    )

    .post(
        '/register',
        async ({ body, set }) => {
            const { name, email, password, targetCategory } = body;

            const exists = await Company.findOne({ $or: [{ name }, { email }] });
            if (exists) {
                set.status = 409;
                return {
                    success: false,
                    message: exists.name === name ? 'Company name already exists.' : 'Email already in use.',
                };
            }

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            const company = await Company.create({
                name,
                email,
                password: hashedPassword,
                targetCategory,
            });

            return {
                success: true,
                message: 'Company registered.',
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
                name: t.String(),
                email: t.String({ format: 'email' }),
                password: t.String({ minLength: 6 }),
                targetCategory: t.String(),
            }),
        }
    )

    .post(
        '/login',
        async ({ body, jwt, set }) => {
            const { identifier, password } = body;

            // Match by name OR email
            const company = await Company.findOne({
                $or: [{ name: identifier }, { email: identifier.toLowerCase() }],
            });

            if (!company) {
                set.status = 404;
                return { success: false, message: 'Company not found.' };
            }

            const valid = await bcrypt.compare(password, company.password);
            if (!valid) {
                set.status = 401;
                return { success: false, message: 'Invalid password.' };
            }

            const token = await jwt.sign({
                id: company._id.toString(),
                name: company.name,
                email: company.email,
                targetCategory: company.targetCategory,
            });

            return {
                success: true,
                message: 'Login successful.',
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
        }
    );