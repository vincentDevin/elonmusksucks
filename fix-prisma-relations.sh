#!/bin/bash

# Fix all the Prisma relation name changes after introspection
# These changed from lowercase to PascalCase

echo "Fixing Prisma relation names..."

# Fix in all TypeScript files
find /Users/devin/Desktop/new-personal-site/elonmusksucks/apps/server/src -name "*.ts" -type f -exec sed -i '' \
  -e 's/include: { bets:/include: { Bet:/g' \
  -e 's/include: { user:/include: { User:/g' \
  -e 's/include: { options:/include: { PredictionOption:/g' \
  -e 's/include: { prediction:/include: { Prediction:/g' \
  -e 's/include: { userBadges:/include: { UserBadge:/g' \
  -e 's/\.userBadges/.UserBadge/g' \
  -e 's/\.bets/.Bet/g' \
  -e 's/\._count\.bets/._count.Bet/g' \
  -e 's/select: { bets:/select: { Bet:/g' \
  -e 's/orderBy: { bets:/orderBy: { Bet:/g' \
  {} \;

echo "Done fixing relation names!"