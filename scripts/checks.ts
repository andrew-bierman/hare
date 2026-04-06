#!/usr/bin/env bun

/**
 * 🐇 Reusable Check Runner Script
 *
 * Runs a configurable series of checks (lint, typecheck, build, test, etc.)
 * with proper error handling, timing, and summary reporting.
 *
 * Usage:
 *   bun run scripts/checks.ts                    # Run default checks
 *   bun run scripts/checks.ts --lint --typecheck # Run specific checks
 *   bun run scripts/checks.ts --all              # Run all available checks
 *   bun run scripts/checks.ts --continue         # Continue on failure
 *   bun run scripts/checks.ts --fix              # Auto-fix issues where possible
 *
 * Available flags:
 *   --check-deps Check monorepo dependency consistency
 *   --sort-pkg   Check package.json files are sorted
 *   --sync-tauri Sync Tauri routes with web app
 *   --lint       Run linting and formatting
 *   --typecheck  Run TypeScript type checking
 *   --build      Run production build
 *   --test       Run tests
 *   --all        Run all checks
 *   --fix        Auto-fix issues where possible (sort-package-json)
 *   --continue   Continue running checks even if one fails
 *   --quiet      Suppress command output (show only summary)
 */

import { $ } from "bun";

interface CheckConfig {
  id: string;
  name: string;
  command: string;
  fixCommand?: string;
  description?: string;
}

interface CheckResult {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  /** Last few lines of output for error display */
  errorLines?: string[];
}

const AVAILABLE_CHECKS: CheckConfig[] = [
  {
    id: "check-deps",
    name: "Check Deps",
    command: "bun run check-deps",
    description: "Check monorepo dependency consistency",
  },
  {
    id: "sort-pkg",
    name: "Sort package.json",
    command: "bun run sort-packages:check",
    fixCommand: "bun run sort-packages",
    description: "Check package.json files are sorted",
  },
  {
    id: "sync-tauri",
    name: "Sync Tauri Routes",
    command: "bun run tauri:sync-routes",
    description: "Sync Tauri routes with web app",
  },
  {
    id: "lint",
    name: "Lint",
    command: "bun run check:fix",
    description: "Run Biome linting and formatting with auto-fix",
  },
  {
    id: "lint-custom",
    name: "Custom Lint",
    command: "bun run lint:custom",
    description: "Check for magic values, raw strings, and code patterns",
  },
  {
    id: "typecheck",
    name: "TypeScript",
    command: "bun run typecheck",
    description: "Run TypeScript type checking",
  },
  {
    id: "build",
    name: "Build",
    command: "bun run build",
    description: "Run production build",
  },
  {
    id: "test",
    name: "Test",
    command: "bun run test",
    description: "Run test suite",
  },
];

const DEFAULT_CHECK_IDS = [
  "check-deps",
  "sort-pkg",
  "sync-tauri",
  "lint",
  "lint-custom",
  "typecheck",
  "build",
];

interface ParsedArgs {
  checkIds: string[];
  continueOnFailure: boolean;
  quiet: boolean;
  fix: boolean;
}

const FLAG_OPTIONS = ["--continue", "--quiet", "--all", "--fix"];

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return {
      checkIds: DEFAULT_CHECK_IDS,
      continueOnFailure: false,
      quiet: false,
      fix: false,
    };
  }

  const continueOnFailure = args.includes("--continue");
  const quiet = args.includes("--quiet");
  const fix = args.includes("--fix");

  if (args.includes("--all")) {
    return {
      checkIds: AVAILABLE_CHECKS.map((c) => c.id),
      continueOnFailure,
      quiet,
      fix,
    };
  }

  const checkIds = args
    .filter((arg) => arg.startsWith("--") && !FLAG_OPTIONS.includes(arg))
    .map((arg) => arg.slice(2))
    .filter((id) => AVAILABLE_CHECKS.some((c) => c.id === id));

  if (checkIds.length === 0) {
    return { checkIds: DEFAULT_CHECK_IDS, continueOnFailure, quiet, fix };
  }

  return { checkIds, continueOnFailure, quiet, fix };
}

/** Extract meaningful error lines from command output */
function extractErrorLines(output: string, maxLines = 8): string[] {
  const lines = output.split("\n").filter((line) => line.trim());
  // Look for error patterns
  const errorPatterns = [/error/i, /failed/i, /cannot find/i, /TS\d+:/];
  const errorLines = lines.filter((line) =>
    errorPatterns.some((pattern) => pattern.test(line))
  );
  if (errorLines.length > 0) {
    return errorLines.slice(0, maxLines);
  }
  // Fall back to last N lines
  return lines.slice(-maxLines);
}

async function runCheck(options: {
  config: CheckConfig;
  quiet: boolean;
  fix: boolean;
}): Promise<CheckResult> {
  const { config, quiet, fix } = options;
  const start = performance.now();
  const command = fix && config.fixCommand ? config.fixCommand : config.command;

  try {
    if (quiet) {
      await $`${command.split(" ")}`.quiet();
    } else {
      await $`${command.split(" ")}`;
    }

    return {
      id: config.id,
      name: config.name,
      success: true,
      duration: performance.now() - start,
    };
  } catch (error) {
    // Extract error output for summary
    let errorLines: string[] = [];
    if (error && typeof error === "object") {
      const shellError = error as { stdout?: Buffer; stderr?: Buffer };
      const output = [
        shellError.stderr?.toString() || "",
        shellError.stdout?.toString() || "",
      ].join("\n");
      errorLines = extractErrorLines(output);
    }

    return {
      id: config.id,
      name: config.name,
      success: false,
      duration: performance.now() - start,
      error: error instanceof Error ? error.message : String(error),
      errorLines,
    };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function printSummary(options: {
  results: CheckResult[];
  wallTime: number;
}): void {
  const { results, wallTime } = options;
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const total = results.length;

  console.log("\n" + "─".repeat(55));
  console.log("📊 Summary");
  console.log("─".repeat(55));

  for (const result of results) {
    const icon = result.success ? "✅" : "❌";
    const duration = formatDuration(result.duration);
    console.log(`${icon} ${result.name.padEnd(20)} ${duration.padStart(8)}`);
  }

  console.log("─".repeat(55));
  console.log(`⏱️  Total: ${formatDuration(wallTime)}`);

  if (failed === 0) {
    console.log(`🎉 All ${total} checks passed`);
  } else {
    console.log(`💥 ${failed}/${total} failed`);
    // Show error details for each failed check
    for (const result of results.filter((r) => !r.success)) {
      console.log(`\n   ${result.name}:`);
      if (result.errorLines && result.errorLines.length > 0) {
        for (const line of result.errorLines) {
          console.log(`   ${line}`);
        }
      }
    }
  }
}

async function runChecks(options: {
  checks: CheckConfig[];
  continueOnFailure: boolean;
  quiet: boolean;
  fix: boolean;
}): Promise<{ results: CheckResult[]; wallTime: number }> {
  const { checks, continueOnFailure, quiet, fix } = options;
  const results: CheckResult[] = [];
  const startTime = performance.now();

  console.log(`🐇 Running ${checks.length} checks${fix ? " (with auto-fix)" : ""}...\n`);

  for (const check of checks) {
    const usingFix = fix && check.fixCommand;
    console.log(`🔍 ${check.name}${usingFix ? " (fixing)" : ""}...`);

    const result = await runCheck({ config: check, quiet, fix });
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Passed (${formatDuration(result.duration)})\n`);
    } else {
      console.log(`   ❌ Failed (${formatDuration(result.duration)})\n`);

      if (!continueOnFailure) {
        break;
      }
    }
  }

  return { results, wallTime: performance.now() - startTime };
}

async function main(): Promise<void> {
  const { checkIds, continueOnFailure, quiet, fix } = parseArgs();

  const checks = checkIds
    .map((id) => AVAILABLE_CHECKS.find((c) => c.id === id))
    .filter((c): c is CheckConfig => c !== undefined);

  if (checks.length === 0) {
    console.error("❌ No valid checks specified");
    console.log("\nAvailable checks:");
    for (const check of AVAILABLE_CHECKS) {
      console.log(`  --${check.id.padEnd(12)} ${check.description}`);
    }
    process.exit(1);
  }

  const { results, wallTime } = await runChecks({ checks, continueOnFailure, quiet, fix });

  printSummary({ results, wallTime });

  const hasFailures = results.some((r) => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

export { AVAILABLE_CHECKS, runChecks, type CheckConfig, type CheckResult };
