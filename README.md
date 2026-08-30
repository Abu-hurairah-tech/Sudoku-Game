<div align="center">

# ✨ **Modern Sudoku & AI Tutor** 🧠

### *Challenge Your Mind. Master the Logic.*

> 🎯 A **premium, intelligent web application** that generates mathematically unique Sudoku puzzles and provides personalized coaching through an adaptive AI tutor—empowering players to think critically, not just guess randomly.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-yellow.svg)]()
[![Web Workers](https://img.shields.io/badge/Powered%20by-Web%20Workers-green.svg)]()

</div>

---

## 🚀 **Core Features**

### 🎲 **Algorithmic Board Generation**
Leverages a sophisticated **recursive depth-first search (DFS) backtracking engine** to craft mathematically sound puzzles guaranteed to have exactly one unique solution. Every puzzle is 100% original—no duplicates, ever.

### ⚡ **Lightning-Fast Puzzle Generation**
Expert-level puzzles (up to 59 clues removed) generate instantly without freezing your UI. Powered by **Web Workers**, all heavy computational lifting happens in the background while you stay responsive.

### 🤖 **Intelligent AI Tutor System**
Forget brute-force hints! Our rule-based AI:
- 🔍 Analyzes your live board in real-time
- 📚 Teaches problem-solving techniques (**Naked Singles, Hidden Singles, Naked Pairs**, etc.)
- 🧬 Learns from your playing style and adapts guidance
- 💭 Explains *why*, not just *what*

### 💾 **Infinite Undo/Redo Memory**
Every move is a snapshot. Roll back or replay with `Ctrl+Z` / `Ctrl+Y` without losing your clues or hint history. Never get stuck!

### 📝 **Smart Pencil Notes**
- 🖊️ **Auto-Generate:** Get instant candidate notes based on Sudoku logic
- ✍️ **Manual Mode:** Mark possibilities yourself with `P` / `N`
- 🧹 **Auto-Cleanup:** Conflicting notes vanish when you place a number

### ⌨️ **Keyboard-First Workflow**
**WASD** or **Arrow keys** for navigation, **1-9** for placement, **Backspace** to erase. Zero mouse clicks needed—pure speed.

### 🎨 **Beautiful, Responsive Design**
- 📱 **Mobile-Optimized:** Plays flawlessly on any screen size
- 🌙 **Dark Mode:** Easy on the eyes, persistent across sessions
- ✨ **Smooth Animations:** CSS Confetti on victory, polished transitions throughout

---

## 🛠️ **Technology Stack**

| Layer | Technologies |
|-------|---------------|
| **Frontend** | HTML5, CSS3 (Variables, Grid, Flexbox, Media Queries), Vanilla JavaScript (ES6+) |
| **Concurrency** | Web Workers API |
| **Data Persistence** | LocalStorage API (themes, personal records, AI learning profile) |
| **Effects & Animation** | CSS Keyframes, Canvas Confetti |

---

## 🎮 **Keyboard Shortcuts Cheat Sheet**

| Key(s) | Action | Tip |
|--------|--------|-----|
| **1-9** | Place a number or pencil mark | Rapid solving mode |
| **Backspace / Delete / X** | Erase current cell | Oops? No problem! |
| **W, A, S, D** or **↑ ↓ ← →** | Move around the board | All keyboard, zero mouse |
| **P** / **N** | Toggle Pencil (Notes) Mode | Switch on the fly |
| **Ctrl + Z** | Undo last move | Build confidence, take risks |
| **Ctrl + Y** | Redo last move | Change your mind anytime |
| **Esc** | Close menus or dialogs | Quick escape |

---

## 💻 **Quick Start Guide**

### 1️⃣ **Clone the Repository**

```bash
git clone https://github.com/Abu-hurairah-tech/Sudoku-Game.git
cd Sudoku-Game
```