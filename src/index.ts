import { Elysia } from 'elysia';

import { connectDB } from '@/src/config/db';
import { dashboardRoutes } from '@/src/api/dashboard';
import { companyAuthRoutes } from '@/src/api/company-auth';

import '@/src/bot/telegram'; 

const startServer = async () => {
    await connectDB();

    const app = new Elysia()
        .use(dashboardRoutes)
        .use(companyAuthRoutes)
        .listen(process.env.PORT || 3000);

    console.log(`🦊 Elysia API (Frontend Gateway) menyala di port ${app.server?.port}`);
};

startServer();