# 🍦☢️ PISCATAWAY PANIC — Claude Code Handoff Brief

## Project Overview

**Piscataway Panic** is a top-down arcade zombie shooter set in Piscataway, New Jersey. The tone is fun, campy, and "memey" — a love letter to Piscataway for people who grew up there. Think Hotline Miami meets a retro quarter-muncher, but with soft serve ice cream launchers and a radioactive goat companion.

**Target platform:** Browser (HTML5 canvas or Phaser.js)
**Art style:** Pixel art
**Resolution:** 16:9, retro low-res feel (960×540 or similar, scaled up)

-----

## Tech Stack Recommendation

- **Phaser 3** (preferred) or vanilla HTML5 Canvas + JS
- No backend required — fully client-side
- Chiptune audio: use royalty-free .ogg files or Web Audio API procedural bleeps

-----

## Core Gameplay

### Movement & Camera

- Top-down, 8-directional movement (WASD or arrow keys)
- Linear left-to-right scrolling levels
- Camera follows player with slight lead in movement direction

### Combat System

- Player carries **one active weapon at a time**
- Pick up a new weapon to swap (old one drops)
- **No ammo system** — weapons have a **cooldown/heat meter** instead
- Basic attack: tap to fire. Hold for auto-fire on most weapons (slower heat buildup)
- Melee fallback: one default melee swipe when no weapon is equipped (low damage, short range)

### Player Stats

- **Health bar** — 5 hit points, each hit removes one
- **Checkpoints** — respawn at last checkpoint, no lives system
- **Score** — increments per kill, displayed top-right; no multipliers in v1

-----

## The Goat Companion 🐐

- Follows the player at all times from Level 2 onward
- Has its own **"Goat Integrity"** health bar displayed in the HUD (top-left, below player health)
- Takes damage when enemies contact it
- If Goat Integrity hits zero: goat dies, permanent for the rest of the run (no resurrection)
- Goat has no attack — it is purely a liability/mascot
- Goat should have idle, walk, and hurt animations

-----

## Weapons

All weapons are **projectile variants** — same underlying system, different sprites, fire rates, and visual effects. Implement as a weapon class with swappable configs.

| Weapon                     | Found In                   | Mechanic                                                                                                                 |
|----------------------------|----------------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Soft Serve Launcher**    | Level 1 start (Petrucci's) | Fires slow-moving ice cream scoops. On hit: enemy gets "frozen" (slowed) for 1.5s before dying. Satisfying splat effect. |
| **Geiger Squirter**        | Level 1 mid                | Water gun that fires radioactive river water. Fast, low damage, good for crowds. Screen flashes green on kill.           |
| **Stadium Foam Finger**    | Level 2 start              | Fires oversized foam fingers in a spread shot (3-wide). Knockback on hit.                                                |
| **Radioactive Hot Dog**    | Level 2 mid                | Thrown projectile with a short arc. Explodes on impact, small AoE. Hot dog cart is a Level 2 environmental object.       |
| **BioLabs Purge Canister** | Level 3 / Boss             | UV burst grenade. One-time use. Enormous AoE. Reserved for boss fight. Should feel like a big deal when picked up.       |
| **Fists (default)**        | Always available           | Short-range melee swipe. No cooldown. Weak.                                                                              |

-----

## Levels

### LEVEL 1 — "Johnson Park After Dark"

**Setting:** Petrucci's Ice Cream → Johnson Park riverfront trail → park exit gate

**Flow:**

1. Opens at **Petrucci's Ice Cream** storefront. Player picks up the Soft Serve Launcher immediately — tutorial weapon.
1. Scrolls right through Johnson Park: picnic tables, riverside path, trees, the Raritan River visible in the background.
1. **Environmental hazards:** Flooded sections of the park slow movement. Infected Canada geese that charge the player (they do not shoot, just rush).
1. **Mini-boss mid-level:** A large infected black bear from the park. Slow, tanky, charges in a straight line. Drops the Geiger Squirter on death.
1. **Level exit:** Park gate. Cutscene: Alex finds the goat tied to a fence post. Goat joins party.

**Enemy types this level:**

- Shambling zombie joggers (slow, low HP)
- Infected Canada geese (fast rush, no projectile)
- Zombie fishermen (throw bobbers as slow projectiles)
- Mini-boss: Infected black bear

-----

### LEVEL 2 — "Scarlet Fever"

**Setting:** SHI Stadium exterior → concourse → field

**Flow:**

1. Starts outside stadium. Stadium food cart yields the Radioactive Hot Dog launcher.
1. Concourse section: tighter corridor, more enemies, Stadium Foam Finger pickup mid-way.
1. **Jumbotron gag:** Every 45–60 seconds, the stadium Jumbotron randomly fires a Rutgers-themed message regardless of gameplay (e.g., "GO SCARLET," "BUY SEASON TICKETS," "HAVE YOU TRIED THE NACHOS"). Should make the player laugh.
1. **Boss fight — Sir Redglow (The Radioactive Scarlet Knight):**
   - A towering, glowing radioactive version of the Rutgers Scarlet Knight mascot
   - One phase, mid-complexity
   - Attacks: charges across the field in a straight line; occasionally rears up and slams, creating a shockwave the player must jump/dodge
   - Weak point: glowing visor. Must be hit 12 times to defeat.
   - Death: collapses like a cartoon horse, legs in the air. The Jumbotron displays "THANK YOU FOR COMING."
   - Drops: nothing. Just glory.

**Enemy types this level:**

- Zombie tailgaters (throw beer cans as projectiles)
- Infected referees (blow a whistle that stuns the player briefly before attacking)
- Radioactive raccoons (fast, small, hard to hit)

-----

### LEVEL 3 — "Raritan Landing"

**Setting:** Archaeological dig site → Raritan BioLabs trailer complex → riverbank

**Flow:**

1. Starts at the dig site. Darker palette, more tense.
1. BioLabs trailer complex: indoor section with tighter rooms, more enemy density.
1. BioLabs Purge Canister is found in the final trailer — make the pickup feel significant (brief pause, music sting).
1. **Level exit:** Outdoor riverbank leading to the Cornelius Low House.

**Enemy types this level:**

- Infected archaeologists (throw trowels)
- Mutated corporate drones in BioLabs polos (faster, more HP than basic zombies)
- Spore crawlers (tiny, swarm in groups of 6–8, low HP each)

-----

## BOSS FIGHT — "The Proprietor"

**Location:** Cornelius Low House (unlocked after Level 3)

The Proprietor is an 8-foot-tall infected creature built around a BioLabs researcher. Root-like clusters on his back. Tattered BioLabs polo. Does not shamble — he walks.

### Phase 1 — The Manor Hall

- Moves slowly, hurls "infected seeds" that spawn small crawler zombies on landing
- Weak point: glowing root-clusters on his back
- Stagger him with enough hits → expose back clusters → shoot clusters for real damage
- Mid-fight: staircase collapses, opening second floor arena

### Phase 2 — The Roof

- Faster movement
- Spore-breath attack: clouds the screen for 3 seconds (player must navigate blind)
- Three Colonial weathervanes act as high ground the player can use

### Phase 3 — The Riverbank

- Falls off roof, rises again, fused with building chunks → bigger hit box
- Player must use the BioLabs Purge Canister (one shot) to finish him
- If player missed the Canister pickup: one spare appears in the corner as a last resort

**Death scene:** UV burst hits. Proprietor stops. Root clusters ignite bioluminescent blue, travels up through him — he looks down at his hands — then he simply falls apart. No gore. Like a tree going to sleep. The lawn absorbs him.

**Final cutscene:** Helicopter searchlight sweeps the grounds. Radio crackle: *"We have a confirmed survivor at River Road. Scarlet, is that you? Come in, Scarlet."* Alex looks at the river. Water is still. *…For now.*

**Credits roll.** Post-credits crawl: *"The Middlesex Sampling Plant site is listed as fully remediated by the U.S. Department of Energy. Mostly."*

**Continue screen:** PISCATAWAY PANIC II: POSSUMTOWN

-----

## HUD Layout

```
[Player HP: ♥♥♥♥♥]     SCORE: 000000     [Current Weapon + Heat Meter]
[Goat Integrity: 🐐🐐🐐]
```

- Player HP: top-left
- Goat Integrity: below player HP (only visible from Level 2 onward)
- Score: top-center
- Current weapon icon + heat/cooldown bar: top-right

-----

## Characters

| Character                | Description                                                                                   |
|--------------------------|-----------------------------------------------------------------------------------------------|
| **Alex "Scarlet" Ramos** | Rutgers biochem grad student. Motor scooter rider. Protagonist.                               |
| **Dante**                | Teenage survivor found in Level 2. Background NPC, not playable. 19 years old, very confused. |
| **The Goat**             | No name. Joined at Level 1 exit. Has its own health bar. Unbothered.                          |
| **Sir Redglow**          | Level 2 boss. Radioactive Scarlet Knight. Comedic, not scary.                                 |
| **The Proprietor**       | Final boss. Tragic, not evil.                                                                 |

-----

## Audio Direction

- **Music:** Chiptune throughout. Each level has its own track. Boss fights have a distinct battle theme.
- **Level 1:** Upbeat, bouncy chiptune — summer park vibes gone wrong
- **Level 2:** Stadium rock energy rendered in chiptune
- **Level 3:** Slower, minor key, creepier
- **Boss:** Urgent, driving chiptune with a memorable melody
- **SFX:** Classic arcade bleeps and bloops. Soft serve splat should be especially satisfying.
- **Voice:** Text only. No spoken dialogue.

-----

## Tone Notes

- Fun and memey throughout — this is a love letter to Piscataway, not a horror game
- Enemies are ridiculous, not scary
- Weapon animations should be exaggerated
- The goat is always fine aesthetically (never distressed visually) even as its health bar drains — it just looks vaguely disappointed
- Boss deaths are comedic, not violent
- The Jumbotron in Level 2 fires autonomously — it does not react to gameplay, which is what makes it funny

-----

## Out of Scope for v1

- Multiplayer
- Mobile controls
- Save system (beyond checkpoint state)
- Scooter as a gameplay mechanic (cutscene only)
- Score multipliers or combo system
- Unlockables

-----

*Handoff prepared for Claude Code — Piscataway Panic v1*
