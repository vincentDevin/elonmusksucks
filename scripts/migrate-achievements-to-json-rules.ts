// Migration script to convert all legacy hardcoded achievements to JSON rule system
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface LegacyAchievementMapping {
  name: string;
  eventKeys: string[];
  rule: {
    progress: {
      kind: 'count' | 'streak' | 'threshold' | 'binary';
      incrementIf?: Record<string, unknown>;
      setIf?: Record<string, unknown>;
      resetIf?: Record<string, unknown>;
    };
    unlockWhen: Record<string, unknown>;
    counters?: string[];
  };
}

// Betting achievements mapping
const bettingAchievements: LegacyAchievementMapping[] = [
  {
    name: 'First Bet',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Big Spender', 
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'amount >=': 100000}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Action Junkie',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 100}
    }
  },
  {
    name: 'Hot Hand',
    eventKeys: ['bet:won', 'bet:lost'],
    rule: {
      progress: {
        kind: 'streak',
        incrementIf: {'won': true},
        resetIf: {'won': false}
      },
      unlockWhen: {'progress >=': 5}
    }
  },
  {
    name: 'Paper Hands',
    eventKeys: ['bet:won', 'bet:lost'], 
    rule: {
      progress: {
        kind: 'streak',
        incrementIf: {'won': false},
        resetIf: {'won': true}
      },
      unlockWhen: {'progress >=': 5}
    }
  },
  // === NEW MIGRATIONS: Remaining 23 betting achievements ===
  {
    name: 'Bankrupt Billionaire',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'balance': 0}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Betting Machine',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 500}
    }
  },
  {
    name: 'Billionaire on Paper',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'threshold',
        setIf: {'netProfit': '$.netProfit'}
      },
      unlockWhen: {'progress >=': 1000000000}
    }
  },
  {
    name: 'Burnt a Billion',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'totalLost >=': 1000000000}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Comeback King',
    eventKeys: ['bet:won'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'previousStreak <=': -5},
            {'currentStreak >=': 1}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Defies Probability',
    eventKeys: ['bet:won'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'odds >=': 50},
            {'consecutiveLongShots >=': 3}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Diamond Hands',
    eventKeys: ['bet:won', 'bet:lost'],
    rule: {
      progress: {
        kind: 'streak', 
        incrementIf: {'won': true},
        resetIf: {'won': false}
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Diversified Gambler',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {},
        counters: ['uniqueCategories']
      },
      unlockWhen: {'counters.uniqueCategories >=': 10}
    }
  },
  {
    name: 'First Timer',
    eventKeys: ['bet:won'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Galaxy Brain Parlay',
    eventKeys: ['parlay:won'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'legCount >=': 5}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Grinder 500',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 500}
    }
  },
  {
    name: 'Losing Spiral',
    eventKeys: ['bet:won', 'bet:lost'],
    rule: {
      progress: {
        kind: 'streak',
        incrementIf: {'won': false},
        resetIf: {'won': true}
      },
      unlockWhen: {'progress >=': 15}
    }
  },
  {
    name: 'Lucky Seven',
    eventKeys: ['bet:won', 'bet:lost'],
    rule: {
      progress: {
        kind: 'streak',
        incrementIf: {'won': true},
        resetIf: {'won': false}
      },
      unlockWhen: {'progress >=': 7}
    }
  },
  {
    name: 'MuskBucks Millionaire',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'threshold',
        setIf: {'netProfit': '$.netProfit'}
      },
      unlockWhen: {'progress >=': 1000000}
    }
  },
  {
    name: 'Parlay Architect',
    eventKeys: ['parlay:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'legCount >=': 3}
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Parlay Master',
    eventKeys: ['parlay:won'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'legCount >=': 4}
      },
      unlockWhen: {'progress >=': 5}
    }
  },
  {
    name: 'Parlay Prodigy',
    eventKeys: ['parlay:won'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'legCount >=': 3}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Rags to Riches',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'previousBalance <': 100},
            {'balance >=': 50000}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Speed Demon',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'betsInHour >=': 10}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Statistical Anomaly',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'winRate >=': 0.85},
            {'totalBets >=': 50}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'The Long Shot',
    eventKeys: ['bet:won'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'odds >': 10}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Whale Bettor',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'amount >=': 500000}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'YOLO All-In',
    eventKeys: ['bet:won'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'wasAllIn': true}
      },
      unlockWhen: {'progress >=': 1}
    }
  }
];

// Chat achievements mapping (17 total)
const chatAchievements: LegacyAchievementMapping[] = [
  {
    name: 'First Words',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Chatterbox',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 100}
    }
  },
  {
    name: 'Keyboard Warrior',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 1000}
    }
  },
  {
    name: 'Chat Fiend',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 5000}
    }
  },
  {
    name: 'Chief Shitposter',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 10000}
    }
  },
  {
    name: 'Commentator',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'messageLength >=': 100} // Long messages
      },
      unlockWhen: {'progress >=': 50}
    }
  },
  {
    name: 'Community Meme Lord',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need meme detection or reactions
      },
      unlockWhen: {'progress >=': 500} // Placeholder
    }
  },
  {
    name: 'Debate Champion',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need thread detection
      },
      unlockWhen: {'progress >=': 100} // Placeholder
    }
  },
  {
    name: 'Elon Reply Intern',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need Elon mention detection
      },
      unlockWhen: {'progress >=': 50}
    }
  },
  {
    name: 'Emoji Master',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need emoji detection in content
      },
      unlockWhen: {'progress >=': 100}
    }
  },
  {
    name: 'Free Speech Absolutist',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 2000}
    }
  },
  {
    name: 'Ghost of Chat',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need late night time check
      },
      unlockWhen: {'progress >=': 50}
    }
  },
  {
    name: 'Reply Guy',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need reply detection
      },
      unlockWhen: {'progress >=': 200}
    }
  },
  {
    name: 'Thread Starter',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need thread start detection
      },
      unlockWhen: {'progress >=': 25}
    }
  },
  {
    name: 'Typing Titan',
    eventKeys: ['chat:typing:start'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 1000}
    }
  },
  {
    name: 'Upvote Magnet',
    eventKeys: ['chat:message:upvoted'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 100}
    }
  },
  {
    name: 'Viral Sensation',
    eventKeys: ['chat:message:upvoted'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 500}
    }
  }
];

// Prediction achievements mapping (12 total)
const predictionAchievements: LegacyAchievementMapping[] = [
  {
    name: 'Prediction Pioneer',
    eventKeys: ['prediction:created'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Prediction Factory',
    eventKeys: ['prediction:created'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 100}
    }
  },
  {
    name: 'Chaos Agent',
    eventKeys: ['prediction:approved'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Trendsetter',
    eventKeys: ['prediction:approved'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {}
      },
      unlockWhen: {'progress >=': 50}
    }
  },
  {
    name: 'Crystal Ball',
    eventKeys: ['prediction:resolved'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'outcome': 'correct'} // Would need win/loss tracking
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Prophet of Mars',
    eventKeys: ['prediction:resolved'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'outcome': 'correct'}
      },
      unlockWhen: {'progress >=': 50}
    }
  },
  {
    name: 'Musk Whisperer',
    eventKeys: ['prediction:created'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'category': 'elon'} // Elon-related predictions
      },
      unlockWhen: {'progress >=': 20}
    }
  },
  {
    name: 'Cursed Predictor',
    eventKeys: ['prediction:resolved'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'outcome': 'incorrect'}
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Fast and Right',
    eventKeys: ['prediction:resolved'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'outcome': 'correct'},
            {'resolutionTimeHours <=': 24}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Crowd Favorite',
    eventKeys: ['prediction:bet_placed'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'totalBetsOnPrediction >=': 100} // Popular prediction
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Media Magnet',
    eventKeys: ['prediction:created'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need source link detection
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Viral Predictor',
    eventKeys: ['prediction:created'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'totalViews >=': 1000} // High engagement prediction
      },
      unlockWhen: {'progress >=': 1}
    }
  }
];

// Leaderboard achievements mapping (14 total)
const leaderboardAchievements: LegacyAchievementMapping[] = [
  {
    name: 'On the Board',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'rank <=': 100}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Podium Finisher', 
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'rank <=': 3}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Chief Musk Whisperer',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'isFirst': true} // Rank 1
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Clown of the Week',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'rank >=': 90},
            {'profitAll <': 0}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Comeback Artist',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'previousRank >=': 50},
            {'rank <=': 10},
            {'isImprovement': true}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Comeback Kid',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'previousRank >=': 25},
            {'rank <=': 5},
            {'isImprovement': true}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Consistency King',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {
          'and': [
            {'rank <=': 20},
            {'winRate >=': 0.6}
          ]
        }
      },
      unlockWhen: {'progress >=': 10} // 10 times in top 20 with good win rate
    }
  },
  {
    name: 'High Roller',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'rank <=': 10},
            {'totalBets >=': 500} // High volume trader
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Monthly Champion',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'isFirst': true} // Would need monthly period tracking
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Parlay King',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'rank <=': 5},
            {'totalBets >=': 100} // Active high-ranking player (parlay data would need separate event)
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Rocket Fumbler',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'previousRank <=': 10},
            {'rank >=': 50},
            {'isImprovement': false}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Volume Leader',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'rank <=': 10},
            {'totalBets >=': 1000}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Weekend Warrior',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'rank <=': 25} // Would need weekend time check
      },
      unlockWhen: {'progress >=': 5}
    }
  },
  {
    name: 'Whale of Wall Street',
    eventKeys: ['leaderboard:rank:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'rank <=': 3},
            {'profitAll >=': 1000000} // 1M+ profit
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  }
];

// Secret achievements mapping (9 total)
const secretAchievements: LegacyAchievementMapping[] = [
  {
    name: 'Cult Leader',
    eventKeys: ['user:followers:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'followerCount >=': 1000}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Dev Whisperer',
    eventKeys: ['admin:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'action': 'dev_interaction'} // Manual admin trigger
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Dumpster Fire Aficionado',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'netProfit <=': -1000000}, // Lost 1M+
            {'totalBets >=': 100}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Easter Egg Hunter',
    eventKeys: ['admin:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'action': 'easter_egg_found'} // Manual admin trigger
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Meme Legend',
    eventKeys: ['chat:message:sent'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Would need viral message detection
      },
      unlockWhen: {'progress >=': 1} // Placeholder - would be manual
    }
  },
  {
    name: 'Rocket Man',
    eventKeys: ['admin:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'action': 'spacex_achievement'} // Manual admin trigger
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Site Legend',
    eventKeys: ['admin:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'action': 'legend_status'} // Manual admin trigger
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'True Visionary',
    eventKeys: ['prediction:resolved'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'outcome': 'correct'},
            {'odds >=': 100}, // Very unlikely prediction that came true
            {'isVisionaryPrediction': true} // Would need manual flagging
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Banhammer Survivor',
    eventKeys: ['user:moderation:action'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'action': 'unban'}
      },
      unlockWhen: {'progress >=': 1}
    }
  }
];

// Shame achievements mapping (4 total)
const shameAchievements: LegacyAchievementMapping[] = [
  {
    name: 'Community Menace',
    eventKeys: ['user:moderation:action'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'action': 'warning'}
      },
      unlockWhen: {'progress >=': 5} // 5 warnings
    }
  },
  {
    name: 'One Week Timeout',
    eventKeys: ['user:moderation:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'action': 'ban'},
            {'duration >=': 7} // 7+ day ban
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Perma-banned Legend',
    eventKeys: ['user:moderation:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'action': 'ban'},
            {'isPermanent': true}
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Scammer of MuskBucks',
    eventKeys: ['admin:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'action': 'scammer_flagged'} // Manual admin trigger
      },
      unlockWhen: {'progress >=': 1}
    }
  }
];

// Participation achievements mapping (15 total)
const participationAchievements: LegacyAchievementMapping[] = [
  {
    name: 'Bug Hunter',
    eventKeys: ['admin:action'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'action': 'bug_report_confirmed'}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Chaos Newsletter',
    eventKeys: ['user:newsletter:action'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'action': 'subscribed'}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Consistent Gambler',
    eventKeys: ['bet:placed'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Daily betting streak would need date tracking
      },
      unlockWhen: {'progress >=': 30} // 30 days of betting
    }
  },
  {
    name: 'Conspiracy Theorist',
    eventKeys: ['prediction:created'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'category': 'conspiracy'} // Conspiracy category predictions
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Daily Visit Streak',
    eventKeys: ['user:visit:daily'],
    rule: {
      progress: {
        kind: 'streak',
        incrementIf: {'visitedToday': true},
        resetIf: {'visitedToday': false}
      },
      unlockWhen: {'progress >=': 30}
    }
  },
  {
    name: 'Daily Visitor',
    eventKeys: ['user:visit:daily'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'visitedToday': true}
      },
      unlockWhen: {'progress >=': 7} // 7 days total
    }
  },
  {
    name: 'Early Adopter',
    eventKeys: ['user:created'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'registeredBefore': '2024-01-01'} // Early platform registration
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Influence Peddler',
    eventKeys: ['user:followers:update'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'followerCount >=': 50}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Late Stage Capitalist',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'balance >=': 100000} // 100k MuskBucks balance
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Profile Complete',
    eventKeys: ['user:profile:updated'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {'profileComplete': true}
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Profile Perfectionist',
    eventKeys: ['user:profile:updated'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Profile updates
      },
      unlockWhen: {'progress >=': 10}
    }
  },
  {
    name: 'Social Butterfly',
    eventKeys: ['user:social:action'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Social interactions (follows, likes, etc.)
      },
      unlockWhen: {'progress >=': 100}
    }
  },
  {
    name: 'Ultimate Degenerate',
    eventKeys: ['user:balance:snapshot'],
    rule: {
      progress: {
        kind: 'binary',
        incrementIf: {
          'and': [
            {'totalBets >=': 1000},
            {'totalWagered >=': 5000000} // 5M+ wagered
          ]
        }
      },
      unlockWhen: {'progress >=': 1}
    }
  },
  {
    name: 'Weekly Regular',
    eventKeys: ['user:visit:weekly'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {'activeThisWeek': true}
      },
      unlockWhen: {'progress >=': 12} // 12 weeks active
    }
  },
  {
    name: 'Welcome Wagon',
    eventKeys: ['user:referral:success'],
    rule: {
      progress: {
        kind: 'count',
        incrementIf: {} // Successful referrals
      },
      unlockWhen: {'progress >=': 5}
    }
  }
];

async function migrateAchievements() {
  console.log('🚀 Starting achievement migration to JSON rules...');
  
  const allMappings = [
    ...bettingAchievements,
    ...chatAchievements, 
    ...predictionAchievements,
    ...leaderboardAchievements,
    ...secretAchievements,
    ...shameAchievements,
    ...participationAchievements
  ];

  let migrated = 0;
  let skipped = 0;
  
  for (const mapping of allMappings) {
    try {
      // Find achievement by name (case-sensitive match)
      const achievement = await prisma.achievement.findFirst({
        where: { 
          title: mapping.name,
          ruleData: { equals: Prisma.DbNull } // Only migrate those without rules
        }
      });
      
      if (!achievement) {
        console.log(`⚠️  Achievement not found or already has rules: ${mapping.name}`);
        skipped++;
        continue;
      }

      // Update with JSON rule
      await prisma.achievement.update({
        where: { id: achievement.id },
        data: {
          ruleData: {
            eventKeys: mapping.eventKeys,
            ...mapping.rule
          }
        }
      });
      
      console.log(`✅ Migrated: ${mapping.name}`);
      migrated++;
      
    } catch (error) {
      console.error(`❌ Failed to migrate ${mapping.name}:`, error);
    }
  }
  
  console.log(`\n📊 Migration complete:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
}

// Run migration
migrateAchievements()
  .catch(console.error)
  .finally(() => prisma.$disconnect());