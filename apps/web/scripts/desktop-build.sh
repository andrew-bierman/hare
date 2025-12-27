#!/bin/bash
# Desktop build script with SPA fallback support

set -e

# Move API routes out of the way (not needed for desktop - uses hosted API)
mv src/app/api src/app/_api

# Build the static export
TAURI_BUILD=true \
NEXT_PUBLIC_API_URL=https://hare.pages.dev \
NEXT_PUBLIC_APP_URL=https://hare.pages.dev \
next build

# Restore API routes
mv src/app/_api src/app/api

# Setup SPA fallback routing
# Copy the catch-all page to handle direct navigation to dynamic routes
echo "Setting up SPA fallback routing..."

# Create 200.html for SPA fallback (some static hosts use this)
if [ -f "out/index.html" ]; then
    cp out/index.html out/200.html
fi

# Copy the agents catch-all to a fallback location
if [ -f "out/dashboard/agents/_.html" ]; then
    # For Tauri, we need the fallback at the parent level too
    mkdir -p out/dashboard/agents/_
    cp out/dashboard/agents/_.html out/dashboard/agents/_/index.html
fi

echo "Desktop build complete!"
