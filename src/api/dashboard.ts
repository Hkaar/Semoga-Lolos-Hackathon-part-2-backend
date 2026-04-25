import { Elysia, t } from 'elysia';
import { Report } from '@/src/models/Report';
import { User } from '@/src/models/User';

import { dayRange } from '@/utils/geocode';

export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
    .get('/reports', async ({ query }) => {
        try {
            const { startDate, endDate, limit = '50', page = '1' } = query;

            const filter: Record<string, any> = {};

            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) {
                    const s = new Date(startDate);
                    s.setUTCHours(0, 0, 0, 0);
                    filter.createdAt.$gte = s;
                }
                if (endDate) {
                    const e = new Date(endDate);
                    e.setUTCHours(23, 59, 59, 999);
                    filter.createdAt.$lte = e;
                }
            }

            const limitNum = Math.min(parseInt(limit), 100);
            const skip = (parseInt(page) - 1) * limitNum;

            const [data, total] = await Promise.all([
                Report.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .select('title description actionType isAuthentic impactScore location_name location extractedMetrics imageUrl createdAt')
                    .lean(),
                Report.countDocuments(filter)
            ]);

            return {
                status: "success",
                data,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum),
                }
            };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil data dari database" };
        }
    }, {
        query: t.Object({
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            page: t.Optional(t.String()),
        })
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
                .select('location location_name actionType impactScore createdAt');

            return { status: "success", data: points };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil data peta" };
        }
    })

    /**
     * GET /api/stats/overview
     * KPI cards: total, verified, rejected, verification_rate (0-100)
     * Always today vs yesterday
     */
    .get('/stats/overview', async () => {
        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const { start: todayStart, end: todayEnd } = dayRange(today);
            const { start: yestStart, end: yestEnd } = dayRange(yesterday);

            const statsPipeline = (start: Date, end: Date) => [
                { $match: { createdAt: { $gte: start, $lte: end } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        verified: { $sum: { $cond: [{ $eq: ['$isAuthentic', true] }, 1, 0] } },
                        rejected: { $sum: { $cond: [{ $eq: ['$isAuthentic', false] }, 1, 0] } },
                    }
                }
            ];

            const [todayStats, yestStats] = await Promise.all([
                Report.aggregate(statsPipeline(todayStart, todayEnd)),
                Report.aggregate(statsPipeline(yestStart, yestEnd)),
            ]);

            const td = todayStats[0] ?? { total: 0, verified: 0, rejected: 0 };
            const yd = yestStats[0] ?? { total: 0, verified: 0, rejected: 0 };

            const pctDelta = (a: number, b: number) =>
                b === 0 ? null : Math.round(((a - b) / b) * 100);

            const verification_rate = td.total === 0 ? 0 : Math.round((td.verified / td.total) * 100);
            const yest_verification_rate = yd.total === 0 ? 0 : Math.round((yd.verified / yd.total) * 100);

            return {
                status: "success",
                data: {
                    total_actions: td.total,
                    verified: td.verified,
                    rejected: td.rejected,
                    verification_rate,
                    deltas: {
                        total_actions: pctDelta(td.total, yd.total),
                        verified: pctDelta(td.verified, yd.verified),
                        verification_rate: pctDelta(verification_rate, yest_verification_rate),
                    }
                }
            };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil stats overview" };
        }
    })

    /**
     * GET /api/stats/today
     * Impact summary: waste_kg, trees_planted, co2e_reduced_kg, active_citizens
     * Always today vs yesterday
     */
    .get('/stats/today', async () => {
        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const { start: todayStart, end: todayEnd } = dayRange(today);
            const { start: yestStart, end: yestEnd } = dayRange(yesterday);

            const metricsPipeline = (start: Date, end: Date) => [
                { $match: { createdAt: { $gte: start, $lte: end }, isAuthentic: true } },
                {
                    $group: {
                        _id: null,
                        waste_kg: { $sum: '$extractedMetrics.waste_kg' },
                        trees_planted: { $sum: '$extractedMetrics.trees_planted' },
                        co2e_reduced_kg: { $sum: '$extractedMetrics.co2e_reduced_kg' },
                        active_citizens: { $addToSet: '$chatId' },
                    }
                },
                {
                    $project: {
                        waste_kg: 1,
                        trees_planted: 1,
                        co2e_reduced_kg: 1,
                        active_citizens: { $size: '$active_citizens' }
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
                b === 0 ? null : Math.round(((a - b) / b) * 100);

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
                        active_citizens: pctDelta(td.active_citizens, yd.active_citizens),
                    }
                }
            };
        } catch (error) {
            return { status: "error", message: "Gagal mengambil stats today" };
        }
    });