# ── Metrics + Webhooks routes (add to each service) ──
// Add these lines after the health check endpoints in each service:
//
// import { metricsEndpoint, metricsMiddleware, webhookEndpoints } from '@saas/robustness';
//
// app.use(metricsMiddleware());
// app.get('/metrics', metricsEndpoint());
// app.use('/webhooks', webhookEndpoints());
