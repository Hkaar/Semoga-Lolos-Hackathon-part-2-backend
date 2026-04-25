import { Elysia } from 'elysia';
import { Report } from '../models/Report';
import { User } from '../models/User';

export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
    .get('/reports', async () => {
        try {
            const data = await Report.find().sort({ createdAt: -1 }).limit(50);
            return { status: "success", data };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil data dari database" };
        }
    })
    .get('/leaderboard', async () => {
        try {
            const topUsers = await User.find()
                .sort({ totalImpactScore: -1 })
                .limit(5)
                .select('firstName username totalImpactScore totalReports solanaWalletAddress'); 
            
            return { status: "success", data: topUsers };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil data leaderboard" };
        }
    })
    .get('/map-points', async () => {
        try {
            const points = await Report.find({ "location.lat": { $exists: true } })
                .select('location actionType impactScore createdAt');
            
            return { status: "success", data: points };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil data peta" };
        }
    });