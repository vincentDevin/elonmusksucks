#!/bin/bash

# Revert all the bad Prisma relation changes back to lowercase
echo "Reverting Prisma relation changes..."

find /Users/devin/Desktop/new-personal-site/elonmusksucks/apps/server/src -name "*.ts" -type f -exec sed -i '' \
  -e 's/include: { Bet:/include: { bets:/g' \
  -e 's/include: { User:/include: { user:/g' \
  -e 's/include: { PredictionOption:/include: { options:/g' \
  -e 's/include: { Prediction:/include: { prediction:/g' \
  -e 's/include: { UserBadge:/include: { userBadges:/g' \
  -e 's/\.UserBadge/.userBadges/g' \
  -e 's/\.Bet/.bets/g' \
  -e 's/\._count\.Bet/._count.bets/g' \
  -e 's/select: { Bet:/select: { bets:/g' \
  -e 's/orderBy: { Bet:/orderBy: { bets:/g' \
  -e 's/\.User/.user/g' \
  -e 's/\.Prediction/.prediction/g' \
  -e 's/\.PredictionOption/.optionOption/g' \
  -e 's/include: { User_UserPost_authorIdToUser:/include: { author:/g' \
  -e 's/\.User_UserPost_authorIdToUser/.author/g' \
  -e 's/include: { other_UserPost:/include: { children:/g' \
  -e 's/\.other_UserPost/.children/g' \
  -e 's/include: { Badge:/include: { badge:/g' \
  -e 's/\.Badge/.badge/g' \
  -e 's/include: { ParlayLeg:/include: { legs:/g' \
  -e 's/\.ParlayLeg/.legs/g' \
  -e 's/\.Parlay/.parlay/g' \
  {} \;

echo "Done reverting changes!"