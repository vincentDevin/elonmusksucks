#!/bin/bash
# scripts/cleanup-ports.sh
# Cleanup script to kill stray processes on dev ports before starting dev environment

echo "🧹 Cleaning up stray processes on dev ports..."

# Function to kill process on a port with retry
kill_port() {
  local port=$1
  local max_attempts=3
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ -z "$pids" ]; then
      if [ $attempt -eq 1 ]; then
        echo "  ✨ Port $port is free"
      else
        echo "  ✅ Port $port cleaned (attempt $attempt)"
      fi
      return 0
    fi

    if [ $attempt -eq 1 ]; then
      echo "  ⚠️  Found process(es) on port $port: $pids"
    fi

    for pid in $pids; do
      local cmd=$(ps -p $pid -o command= 2>/dev/null || echo "unknown")
      # Check if it's a system process we shouldn't kill
      if [[ "$cmd" == *"ControlCenter"* ]] || [[ "$cmd" == *"System"* ]]; then
        echo "     ⚠️  Skipping system process PID $pid (will try SIGTERM): $cmd"
        # Try gentle kill first for system processes
        kill -15 $pid 2>/dev/null || true
        sleep 0.5
        # If still running, force kill
        if ps -p $pid > /dev/null 2>&1; then
          kill -9 $pid 2>/dev/null || true
        fi
      else
        echo "     Killing PID $pid: $cmd"
        kill -9 $pid 2>/dev/null || true
      fi
    done

    # Wait a bit for the port to be released
    sleep 0.3
    attempt=$((attempt + 1))
  done

  # Final check
  local final_pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$final_pids" ]; then
    echo "  ❌ Warning: Could not free port $port after $max_attempts attempts"
    echo "     Remaining process(es): $final_pids"
    # List what's still using it
    lsof -i :$port 2>/dev/null | head -5
    return 1
  fi

  return 0
}

# Clean up all dev ports
kill_port 3000  # Client
kill_port 5000  # Server
kill_port 5001  # Pong server
kill_port 5173  # Public site

# Give the OS a moment to fully release the ports
sleep 0.5

# Final verification
echo ""
echo "🔍 Verifying all ports are free..."
all_clear=true

for port in 3000 5000 5001 5173; do
  if lsof -ti:$port >/dev/null 2>&1; then
    echo "  ❌ Port $port is STILL in use!"
    all_clear=false
  else
    echo "  ✅ Port $port confirmed free"
  fi
done

if [ "$all_clear" = true ]; then
  echo ""
  echo "✅ Port cleanup complete! All ports verified free."
  exit 0
else
  echo ""
  echo "⚠️  Some ports could not be freed."
  echo ""

  # Check if port 5000 is the problem and if it's AirPlay
  if lsof -ti:5000 >/dev/null 2>&1; then
    airplay_check=$(lsof -i :5000 2>/dev/null | grep ControlCe)
    if [ -n "$airplay_check" ]; then
      echo "🎯 ISSUE DETECTED: macOS AirPlay Receiver is using port 5000"
      echo ""
      echo "📖 Quick Fix - Disable AirPlay Receiver:"
      echo "   1. Open System Settings"
      echo "   2. Go to General → AirDrop & Handoff"
      echo "   3. Toggle OFF 'AirPlay Receiver'"
      echo ""
      echo "   OR see FIX_AIRPLAY_PORT_5000.md for detailed solutions"
      echo ""
    fi
  fi

  echo "💡 Other solutions:"
  echo "   1. Manually kill system processes using these ports"
  echo "   2. Restart your system"
  echo "   3. Use different ports in your .env file"
  exit 1
fi
