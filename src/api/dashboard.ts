import { Elysia } from 'elysia';
import { Report } from '@/src/models/Report';
import { User } from '@/src/models/User';

export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
    
    .get('/reports', async ({ query }) => {
        try {
            const { startDate, endDate, limit = '50', page = '1' } = query;

            const filter: Record<string, any> = {};

            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) {
                    const s = new Date(startDate as string);
                    s.setUTCHours(0, 0, 0, 0);
                    filter.createdAt.$gte = s;
                }
                if (endDate) {
                    const e = new Date(endDate as string);
                    e.setUTCHours(23, 59, 59, 999);
                    filter.createdAt.$lte = e;
                }
            }

            const limitNum = Math.min(parseInt(limit as string), 100);
            const skip = (parseInt(page as string) - 1) * limitNum;

            const [reports, total] = await Promise.all([
                Report.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Report.countDocuments(filter)
            ]);

            const chatIds = [...new Set(reports.map(r => r.chatId))];

            const users = await User.find({ telegramId: { $in: chatIds } }).lean();

            const userMap = new Map();
            users.forEach(u => {
                userMap.set(u.telegramId, u.firstName || u.username || 'Pahlawan Anonim');
            });

            const enrichedReports = reports.map(r => ({
                ...r,
                userName: userMap.get(r.chatId) || r.userName || 'Pahlawan Anonim'
            }));

            return {
                status: 'success',
                data: enrichedReports,
                pagination: {
                    total,
                    page: parseInt(page as string),
                    pages: Math.ceil(total / limitNum)
                }
            };
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    })

    .get('/map-points', async () => {
        try {
            // Hanya ambil laporan yang memiliki koordinat latitude
            const points = await Report.find({ 'location.lat': { $exists: true } })
                .select('location location_name actionType impactScore createdAt')
                .lean();
                
            return { status: 'success', data: points };
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    })

    .get('/stats/today', async () => {
        try {
            const now = new Date();
            
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
            
            const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
            const yestEnd = new Date(todayStart.getTime() - 1);

            const metricsPipeline = (start: Date, end: Date) => [
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end },
                        isAuthentic: true 
                    }
                },
                {
                    $group: {
                        _id: null,
                        waste_kg: { $sum: "$extractedMetrics.waste_kg" },
                        trees_planted: { $sum: "$extractedMetrics.trees_planted" },
                        co2e_reduced_kg: { $sum: "$extractedMetrics.co2e_reduced_kg" },
                        active_citizens: { $addToSet: "$chatId" } 
                    }
                },
                {
                    $project: {
                        waste_kg: 1,
                        trees_planted: 1,
                        co2e_reduced_kg: 1,
                        active_citizens: { $size: "$active_citizens" }
                    }
                }
            ];

            const [todayMetrics, yestMetrics] = await Promise.all([
                Report.aggregate(metricsPipeline(todayStart, todayEnd)),
                Report.aggregate(metricsPipeline(yestStart, yestEnd)),
            ]);

            const td = todayMetrics[0] ?? { waste_kg: 0, trees_planted: 0, co2e_reduced_kg: 0, active_citizens: 0 };
            const yd = yestMetrics[0] ?? { waste_kg: 0, trees_planted: 0, co2e_reduced_kg: 0, active_citizens: 0 };

            const pctDelta = (a: number, b: number) =>
                b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);

            return {
                status: "success",
                data: {
                    waste_kg: td.waste_kg,
                    trees_planted: td.trees_planted,
                    co2e_reduced_kg: td.co2e_reduced_kg,
                    active_citizens: td.active_citizens,
                    deltas: {
                        waste_kg: pctDelta(td.waste_kg, yd.waste_kg),
                        trees_planted: pctDelta(td.trees_planted, yd.trees_planted),
                        co2e_reduced_kg: pctDelta(td.co2e_reduced_kg, yd.co2e_reduced_kg),
                        active_citizens: pctDelta(td.active_citizens, yd.active_citizens)
                    }
                }
            };
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    })

    .get('/stats/overview', async () => {
        try {
            const metrics = await Report.aggregate([
                { $match: { isAuthentic: true } },
                {
                    $group: {
                        _id: null,
                        total_waste_kg: { $sum: "$extractedMetrics.waste_kg" },
                        total_trees_planted: { $sum: "$extractedMetrics.trees_planted" },
                        total_co2e_reduced_kg: { $sum: "$extractedMetrics.co2e_reduced_kg" }
                    }
                }
            ]);

            const data = metrics[0] || { total_waste_kg: 0, total_trees_planted: 0, total_co2e_reduced_kg: 0 };

            return {
                status: 'success',
                data: data
            };
        } catch (error: any) {
            return { status: 'error', message: error.message };
        }
    });