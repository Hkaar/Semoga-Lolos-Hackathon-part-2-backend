import { Elysia } from 'elysia';
import { connectDB } from './config/db';
import { dashboardRoutes } from './api/dashboard';

import './bot/telegram'; 

const startServer = async () => {
    await connectDB();

    const app = new Elysia()
        .use(dashboardRoutes)
        .listen(process.env.PORT || 3000);

    console.log(`🦊 Elysia API (Frontend Gateway) menyala di port ${app.server?.port}`);
};

startServer();