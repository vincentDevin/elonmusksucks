#!/usr/bin/env tsx
/**
 * Update Database with Pong Achievement Rules
 * 
 * This script populates all Pong achievements with their JSON rule definitions
 * enabling automatic achievement unlocking via the AchievementEngine.
 * 
 * Run with: npm run tsx scripts/update-pong-achievement-rules.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rule definitions for each Pong achievement
const PONG_ACHIEVEMENT_RULES = {
  // === BASIC WIN COUNTS ===
  'pong-first-blood': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any',
        'payload.winnerId': '{{ userId }}'
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-10-wins': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any',
        'payload.winnerId': '{{ userId }}'
      }
    },
    unlockWhen: {
      'progress >=': 10
    }
  },

  'pong-50-wins': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any',
        'payload.winnerId': '{{ userId }}'
      }
    },
    unlockWhen: {
      'progress >=': 50
    }
  },

  'pong-100-wins': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any',
        'payload.winnerId': '{{ userId }}'
      }
    },
    unlockWhen: {
      'progress >=': 100
    }
  },

  // === MATCH COUNTS (WINS + LOSSES) ===
  'pong-100-matches': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any'
      }
    },
    unlockWhen: {
      'progress >=': 100
    }
  },

  'pong-500-matches': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any'
      }
    },
    unlockWhen: {
      'progress >=': 500
    }
  },

  'pong-1000-matches': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.vsAI': 'any'
      }
    },
    unlockWhen: {
      'progress >=': 1000
    }
  },

  // === WIN STREAKS ===
  'pong-streak-3': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'streak',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': 'any'
      },
      resetIf: {
        'payload.winnerId': { '!==': '{{ userId }}' }
      }
    },
    unlockWhen: {
      'progress >=': 3
    }
  },

  'pong-streak-5': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'streak',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': 'any'
      },
      resetIf: {
        'payload.winnerId': { '!==': '{{ userId }}' }
      }
    },
    unlockWhen: {
      'progress >=': 5
    }
  },

  'pong-streak-10': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'streak',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': 'any'
      },
      resetIf: {
        'payload.winnerId': { '!==': '{{ userId }}' }
      }
    },
    unlockWhen: {
      'progress >=': 10
    }
  },

  'pong-streak-20': {
    eventKeys: ['pong:match:completed', 'pong:match:lost'],
    progress: {
      kind: 'streak',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': 'any'
      },
      resetIf: {
        'payload.winnerId': { '!==': '{{ userId }}' }
      }
    },
    unlockWhen: {
      'progress >=': 20
    }
  },

  // === PERFORMANCE ACHIEVEMENTS ===
  'pong-perfect-11-0': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.winnerScore': 11,
        'payload.loserScore': 0
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-comeback-king': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.winnerScore': 11,
        'payload.loserScore': { '>=': 6 }  // At least 6 point lead at some point
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-wall-builder': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.loserScore': { '<=': 2 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-speedrunner': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.duration': { '<': 60 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  // === AI DIFFICULTY ACHIEVEMENTS ===
  'pong-ai-easy': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': true,
        'payload.aiDifficulty': 'EASY'
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-ai-medium': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': true,
        'payload.aiDifficulty': 'MEDIUM'
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-ai-hard': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': true,
        'payload.aiDifficulty': 'HARD'
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-ai-impossible': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.vsAI': true,
        'payload.aiDifficulty': 'IMPOSSIBLE'
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  // === HIGH STAKES ACHIEVEMENTS ===
  'pong-highroller-1k': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.wager': { '>=': 1000 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-highroller-10k': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.wager': { '>=': 10000 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-highroller-50k': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.wager': { '>=': 50000 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-highroller-100k': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.wager': { '>=': 100000 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  // === ELO MILESTONE ACHIEVEMENTS ===
  'pong-elo-1400': {
    eventKeys: ['pong:elo:milestone'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.newElo': { '>=': 1400 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-elo-1800': {
    eventKeys: ['pong:elo:milestone'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.newElo': { '>=': 1800 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-elo-2200': {
    eventKeys: ['pong:elo:milestone'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.newElo': { '>=': 2200 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-elo-2600': {
    eventKeys: ['pong:elo:milestone'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.newElo': { '>=': 2600 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  'pong-elo-3000': {
    eventKeys: ['pong:elo:milestone'],
    progress: {
      kind: 'binary',
      incrementIf: {
        'payload.newElo': { '>=': 3000 }
      }
    },
    unlockWhen: {
      'progress >=': 1
    }
  },

  // === FREEPLAY ACHIEVEMENT ===
  'pong-freeplay-enthusiast': {
    eventKeys: ['pong:match:completed'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.winnerId': '{{ userId }}',
        'payload.wager': 0
      }
    },
    unlockWhen: {
      'progress >=': 10
    }
  },

  // === SHAME ACHIEVEMENTS ===
  'pong-ragequit-shame': {
    eventKeys: ['pong:match:lost'],
    progress: {
      kind: 'count',
      incrementIf: {
        'payload.reason': 'disconnect'  // This would need to be added to the event payload
      }
    },
    unlockWhen: {
      'progress >=': 3
    }
  },

  'pong-bot-loss-shame': {
    eventKeys: ['pong:match:lost'],
    progress: {
      kind: 'streak',
      incrementIf: {
        'payload.vsAI': true,
        'payload.aiDifficulty': 'EASY',
        'payload.winnerId': { '!==': '{{ userId }}' }
      },
      resetIf: {
        'payload.winnerId': '{{ userId }}'
      }
    },
    unlockWhen: {
      'progress >=': 2
    }
  }
};

async function main() {
  console.log('🔧 Starting Pong Achievement Rules Update...');

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const [slug, ruleData] of Object.entries(PONG_ACHIEVEMENT_RULES)) {
    try {
      console.log(`📝 Updating rules for achievement: ${slug}`);

      const result = await prisma.achievement.updateMany({
        where: {
          slug: slug,
          category: 'pong'
        },
        data: {
          ruleData: ruleData as any,
          updatedAt: new Date()
        }
      });

      if (result.count === 0) {
        console.warn(`⚠️  Achievement not found: ${slug}`);
        notFoundCount++;
      } else {
        console.log(`✅ Updated ${slug} with ${JSON.stringify(ruleData).length} character rule`);
        updatedCount++;
      }

    } catch (error) {
      console.error(`❌ Error updating ${slug}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Update Summary:');
  console.log(`✅ Successfully updated: ${updatedCount} achievements`);
  console.log(`⚠️  Not found: ${notFoundCount} achievements`);
  console.log(`❌ Errors: ${errorCount} achievements`);
  console.log(`📝 Total rules processed: ${Object.keys(PONG_ACHIEVEMENT_RULES).length}`);

  if (updatedCount > 0) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Run the server to test rule evaluation');
    console.log('2. Play some Pong matches to trigger events');
    console.log('3. Check achievement unlocks in the admin panel');
    console.log('4. Monitor logs for rule evaluation errors');
  }

  console.log('\n🏆 Pong Achievement Rules Update Complete!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });