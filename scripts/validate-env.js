#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env");
const required = ["DATABASE_URL"];

if (!fs.existsSync(envPath)) {
  console.error("Missing .env. Copy .env.example to .env and set DATABASE_URL.");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf8");
const vars = Object.fromEntries(
  env
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
    })
);

const missing = required.filter((key) => !vars[key]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}
