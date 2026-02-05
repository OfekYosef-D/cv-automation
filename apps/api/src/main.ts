import { config } from "dotenv";
import { resolve } from "path";

// Load .env from monorepo root
config({ path: resolve(__dirname, "../../../.env") });

import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

const requiredEnvVars = ["DATABASE_URL"] as const;

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(", ")}. Copy .env.example to .env`);
  }
}

async function bootstrap() {
  validateEnv();
  const port = parseInt(process.env.PORT ?? "3001", 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Enable global validation with transformation
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Enable CORS for local development
  app.enableCors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  });

  await app.listen(port);
}

bootstrap();
