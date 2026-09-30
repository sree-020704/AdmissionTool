import "dotenv/config";
import http from "http";

/**
 * Render provides PORT automatically.
 * Local development falls back to 5001.
 */
const port = Number(process.env.PORT || 5001);

/**
 * Express app handler is attached after the HTTP server starts.
 * This allows /health to respond while the application is booting.
 *
 * @type {((req: import("http").IncomingMessage, res: import("http").ServerResponse) => void) | null}
 */
let appHandler = null;

/**
 * Application bootstrap state.
 */
let applicationReady = false;
let dependencyStartupFailed = false;

/**
 * HTTP server.
 *
 * /health is intentionally handled here so Render can check
 * the process before the complete application bootstrap finishes.
 */
const server = http.createServer((req, res) => {
  const pathOnly = (req.url ?? "/").split("?")[0];

  /**
   * Health endpoint.
   *
   * While dependencies are still starting, return 200 so the
   * container can remain reachable during bootstrap.
   *
   * Once bootstrap finishes:
   *   200 = application ready
   *   503 = dependency/bootstrap failure
   */
  if (pathOnly === "/health") {
    const statusCode = applicationReady
      ? 200
      : dependencyStartupFailed
        ? 503
        : 200;

    res.writeHead(statusCode, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        status: applicationReady
          ? "healthy"
          : dependencyStartupFailed
            ? "unhealthy"
            : "starting",
        message: applicationReady
          ? "Application is ready"
          : dependencyStartupFailed
            ? "Application bootstrap failed"
            : "Application is starting",
        server: {
          listening: server.listening,
          port,
          host: "0.0.0.0",
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        },
        application: {
          ready: applicationReady,
          dependencyStartupFailed,
        },
      }),
    );

    return;
  }

  /**
   * Once Express is loaded, pass all normal requests to it.
   */
  if (appHandler) {
    appHandler(req, res);
    return;
  }

  /**
   * Application is still booting.
   */
  res.writeHead(503, {
    "Content-Type": "application/json",
  });

  res.end(
    JSON.stringify({
      status: "starting",
      message: "Application is still booting",
    }),
  );
});

/**
 * Consistent error logger.
 */
function logError(label, err) {
  console.error(
    JSON.stringify({
      msg: label,
      error: String(err?.stack || err),
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Catch rejected promises that were not handled.
 */
process.on("unhandledRejection", (err) => {
  logError("unhandledRejection", err);
});

/**
 * Catch uncaught exceptions.
 */
process.on("uncaughtException", (err) => {
  logError("uncaughtException", err);
});

/**
 * Graceful shutdown.
 *
 * Render sends SIGTERM when a service is being stopped/replaced.
 */
let shuttingDown = false;

async function shutdown(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    JSON.stringify({
      msg: "Shutting down server...",
      signal,
    }),
  );

  /**
   * Stop accepting new HTTP connections first.
   */
  await new Promise((resolve) => {
    server.close(() => {
      console.log(
        JSON.stringify({
          msg: "HTTP server closed",
        }),
      );

      resolve();
    });
  }).catch((err) => {
    logError("HTTP server close error", err);
  });

  try {
    const { stopEmailWorker } = await import("./core/workers/email.worker.js");

    const { stopSlaWorker } = await import("./core/workers/sla.worker.js");

    const { stopEmbeddingWorker } =
      await import("./core/workers/embedding.worker.js");

    const { stopAiVerificationWorker } =
      await import("./core/workers/ai-verification.worker.js");

    const { stopOfferingExpiryJob } =
      await import("./core/workers/offeringExpiry.worker.js");

    const { stopHealthMonitor } =
      await import("./core/workers/healthMonitor.worker.js");

    const { stopOperationsWorker } =
      await import("./core/workers/operations.worker.js");

    const { closeOperationsQueue } =
      await import("./core/queues/operations.queue.js");

    const { closeEmailQueue } = await import("./core/queues/email.queue.js");

    const { closeSlaQueue } = await import("./core/queues/sla.queue.js");

    const { closeEmbeddingQueue } =
      await import("./core/queues/embedding.queue.js");

    const { closeAiVerificationQueue } =
      await import("./core/queues/ai-verification.queue.js");

    const { closeWebSocket } = await import("./core/config/websocket.js");

    const { closeQueueConnection } =
      await import("./core/queues/connection.js");

    /**
     * Stop workers.
     */
    await stopEmailWorker();
    await stopSlaWorker();
    await stopEmbeddingWorker();
    await stopAiVerificationWorker();

    stopOfferingExpiryJob();
    stopHealthMonitor();

    await stopOperationsWorker();

    /**
     * Close BullMQ queues.
     */
    await closeOperationsQueue();
    await closeEmailQueue();
    await closeSlaQueue();
    await closeEmbeddingQueue();
    await closeAiVerificationQueue();

    /**
     * Close Socket.IO/WebSocket resources.
     */
    await closeWebSocket();

    /**
     * Close Redis/queue connection.
     */
    await closeQueueConnection();

    console.log(
      JSON.stringify({
        msg: "Application resources closed",
      }),
    );
  } catch (err) {
    logError("Shutdown cleanup error", err);
  }

  console.log(
    JSON.stringify({
      msg: "Server shutdown complete",
    }),
  );

  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((err) => {
    logError("SIGINT shutdown failed", err);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((err) => {
    logError("SIGTERM shutdown failed", err);
    process.exit(1);
  });
});

/**
 * Start the HTTP server first.
 *
 * This is useful for Render because the process can begin answering
 * /health before MongoDB, Redis, workers, and other services finish.
 */
async function start() {
  await new Promise((resolve, reject) => {
    server.listen(port, "0.0.0.0", () => {
      console.log(
        JSON.stringify({
          msg: `Server listening on 0.0.0.0:${port}`,
          port,
          host: "0.0.0.0",
          environment: process.env.NODE_ENV || "development",
        }),
      );

      resolve();
    });

    server.once("error", reject);
  });

  try {
    /**
     * Load application modules only after the HTTP server is listening.
     */
    const { logger } = await import("./core/logger/index.js");

    const { default: app } = await import("./app.js");

    const { initWebSocket } = await import("./core/config/websocket.js");

    const { connectDb } = await import("./core/config/db.js");

    const { connectRedis } = await import("./core/config/redis.js");

    const { verifyEmailTransport } =
      await import("./core/services/email.service.js");

    const { startEmailWorker } = await import("./core/workers/email.worker.js");

    const { startSlaWorker } = await import("./core/workers/sla.worker.js");

    const { startEmbeddingWorker } =
      await import("./core/workers/embedding.worker.js");

    const { startAiVerificationWorker } =
      await import("./core/workers/ai-verification.worker.js");

    const { startOfferingExpiryJob } =
      await import("./core/workers/offeringExpiry.worker.js");

    const { startOperationsWorker } =
      await import("./core/workers/operations.worker.js");

    const { startHealthMonitor } =
      await import("./core/workers/healthMonitor.worker.js");

    const { bootstrapEnrollmentServices } =
      await import("./modules/enrollment/enrollment-seed.service.js");

    const { ensureTenantIndexes } =
      await import("./shared/helpers/tenantIndexes.helper.js");

    /**
     * Attach Express to the HTTP server.
     */
    appHandler = app;

    /**
     * Initialize Socket.IO/WebSocket.
     */
    initWebSocket(server);

    /**
     * MongoDB.
     */
    await connectDb();

    /**
     * MongoDB indexes.
     */
    await ensureTenantIndexes();

    /**
     * Redis.
     */
    await connectRedis();

    /**
     * Enrollment seed data/services.
     */
    await bootstrapEnrollmentServices();

    /**
     * Background workers.
     */
    startOperationsWorker();
    startEmailWorker();
    startSlaWorker();
    startEmbeddingWorker();
    startAiVerificationWorker();

    /**
     * Scheduled jobs.
     */
    startOfferingExpiryJob();

    /**
     * SMTP verification runs in background.
     *
     * It should not prevent the application itself from starting.
     */
    verifyEmailTransport().catch((err) => {
      logger.error({ err }, "Background SMTP verification failed");
    });

    /**
     * Health monitor.
     */
    startHealthMonitor();

    /**
     * Mark application as fully ready only after all critical
     * dependency initialization has succeeded.
     */
    applicationReady = true;
    dependencyStartupFailed = false;

    logger.info("Application bootstrap complete");

    console.log(
      JSON.stringify({
        msg: "Application is fully ready",
        port,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (err) {
    /**
     * Keep the process alive long enough for Render logs/health
     * checks to reveal the real dependency failure.
     */
    dependencyStartupFailed = true;
    applicationReady = false;

    logError("Dependency startup failed; application is not ready", err);
  }
}

/**
 * Start the server.
 */
start().catch((err) => {
  logError("Failed to start server", err);
  process.exit(1);
});
