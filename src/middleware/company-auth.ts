import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const companyJwtMiddleware = new Elysia({ name: 'company-jwt-middleware' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'change-this-secret',
            exp: '7d',
        })
    )
    .derive(async ({ jwt, headers, set }) => {
        const auth = headers['authorization'];

        if (!auth || !auth.startsWith('Bearer ')) {
            set.status = 401;
            throw new Error('Missing or malformed Authorization header.');
        }

        const token = auth.slice(7);
        const payload = await jwt.verify(token);

        if (!payload) {
            set.status = 401;
            throw new Error('Invalid or expired token.');
        }

        return {
            company: payload as {
                id: string;
                name: string;
                targetCategory: string;
            },
        };
    });