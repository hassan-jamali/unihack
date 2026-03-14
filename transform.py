import os
import re

def process_file(path, replacements, prepend=""):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    if prepend:
        content = prepend + "\n" + content
        
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

base = "c:/Users/hsueh/Desktop/Deakin/unihack/unihack/"

# 1. config.js
process_file(base + "src/core/config.js", [
    ("function _loadConfig()", "export function _loadConfig()"),
    ("function _saveConfig(cfg)", "export function _saveConfig(cfg)"),
    ("function _resetConfig()", "export function _resetConfig()"),
    ("const Config =", "export const Config ="),
])

# 2. state.js
process_file(base + "src/core/state.js", [
    ("const State =", "export const State ="),
])

# 3. utils.js
process_file(base + "src/core/utils.js", [
    ("function shuffle(", "export function shuffle("),
    ("function sleep(", "export function sleep("),
    ("function triggerAnim(", "export function triggerAnim("),
    ("const cheat =", "export const cheat ="),
    ("export function shuffle(", "import { Player } from '../game/player.js';\nimport { UI } from '../ui/ui.js';\n\nexport function shuffle(")
])

# 4. presets.js
process_file(base + "src/game/presets.js", [
    ("const Presets =", "import { Config } from '../core/config.js';\n\nexport const Presets ="),
])

# 5. player.js
process_file(base + "src/game/player.js", [
    ("const Player =", "import { Config } from '../core/config.js';\nimport { Shop } from '../ui/shop.js';\nimport { UI } from '../ui/ui.js';\n\nexport const Player ="),
])

# 6. shop.js
process_file(base + "src/ui/shop.js", [
    ("const Shop =", "import { Player } from '../game/player.js';\nimport { UI, formatCost } from './ui.js';\n\nexport const Shop ="),
    ("function formatCost", "export function formatCost"),
    ("function openShop()", "export function openShop()"),
    ("function closeShop()", "export function closeShop()"),
    ("function buyItem(id)", "export function buyItem(id)"),
    ("window.openShop = function() { openShop() }", "window.openShop = openShop;\nwindow.closeShop = closeShop;\nwindow.buyItem = buyItem;\n")
])

# 7. ai.js
process_file(base + "src/ai/ai.js", [
    ("const AI =", "import { Config } from '../core/config.js';\nimport { State } from '../core/state.js';\nimport { shuffle } from '../core/utils.js';\n\nexport const AI ="),
])

# 8. ui.js
process_file(base + "src/ui/ui.js", [
    ("const UI =", "import { Config } from '../core/config.js';\nimport { Player } from '../game/player.js';\nimport { State } from '../core/state.js';\nimport { Editor } from './editor.js';\nimport { triggerAnim, sleep } from '../core/utils.js';\nimport { startGame } from '../game/game.js';\n\nexport const UI ="),
    ("function openQuests", "export function openQuests"),
    ("window.openQuests = openQuests;", "")
])

# 9. editor.js
process_file(base + "src/ui/editor.js", [
    ("import { preprocessPDF } from \"./ai/rag.js\";\n", ""),
    ("import { preprocessPDF } from \"../ai/rag.js\";\n", ""),
    ("const Editor =", "import { Config, _saveConfig } from '../core/config.js';\nimport { AI } from '../ai/ai.js';\nimport { UI } from './ui.js';\n\nexport const Editor ="),
    ("const { preprocessPDF } = await import(\"./ai/rag.js\");", "const { preprocessPDF } = await import(\"../ai/rag.js\");"),
])

# 10. game.js
process_file(base + "src/game/game.js", [
    ("function startGame()", "export function startGame()"),
    ("function restartGame()", "export function restartGame()"),
    ("function goToTitle()", "export function goToTitle()"),
    ("function selectAnswer(", "export function selectAnswer("),
    ("async function _nextQuestion(", "export async function _nextQuestion("),
    ("function _triggerEnd(", "export function _triggerEnd("),
], prepend="import { Config, _saveConfig } from '../core/config.js';\nimport { State } from '../core/state.js';\nimport { Player } from './player.js';\nimport { UI } from '../ui/ui.js';\nimport { AI } from '../ai/ai.js';\nimport { Presets } from './presets.js';\nimport { sleep, triggerAnim, cheat } from '../core/utils.js';\n\nwindow.startGame = startGame;\nwindow.restartGame = restartGame;\nwindow.goToTitle = goToTitle;\nwindow.selectAnswer = selectAnswer;\nwindow.cheat = cheat;\n")

# 11. gameboy_shell.js
process_file(base + "src/shells/gameboy_shell.js", [
    ("document.addEventListener(", "import { UI } from '../ui/ui.js';\n\ndocument.addEventListener(")
])

print("done")
