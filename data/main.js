let notes = [], sequence = [], input = [], accepting = false, currentNick = "";
const ctx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(f) {
  let o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
  o.start(); g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  o.stop(ctx.currentTime + 0.5);
}

function setupButtons(rows, cols) {
  const container = document.getElementById("buttons");
  container.innerHTML = "";
  notes = [];
  for (let i = 0; i < rows * cols; i++) {
    let div = document.createElement("div");
    div.className = "note";
    div.textContent = i + 1;
    div.onclick = () => handleInput(i);
    container.appendChild(div);
    notes.push({id: i, freq: 300 + i * 50});
  }
}

function addNote() { sequence.push(Math.floor(Math.random() * notes.length)); }

function playSeq() {
  accepting = false; let i = 0;
  let interval = setInterval(() => {
    if (i >= sequence.length) {
      clearInterval(interval);
      accepting = true; input = [];
    } else {
      playTone(notes[sequence[i]].freq); i++;
    }
  }, 700);
}

function handleInput(id) {
  if (!accepting) return;
  input.push(id);
  playTone(notes[id].freq);
  if (id !== sequence[input.length - 1]) {
    let score = sequence.length - 1;
    alert("Pomyłka! Twój wynik: " + score);
    sendScore(currentNick, score);
    fetchScores();
    showScores();
    return;
  }
  if (input.length === sequence.length) {
    addNote();
    setTimeout(playSeq, 600);
  }
}

function startGame() {
  const nick = document.getElementById("nickInput").value.toUpperCase();
  if (nick.length !== 3) return alert("Podaj dokładnie 3 litery jako nick");
  currentNick = nick;
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
  const [r, c] = document.getElementById("gridSelect").value.split("x").map(Number);
  setupButtons(r, c);
  sequence = [];
  addNote();
  playSeq();
}

function sendScore(nick, score) {
  fetch("/submitScore", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `nick=${nick}&score=${score}`
  });
}

function fetchScores() {
  fetch("/getScores").then(res => res.json()).then(data => {
    data.sort((a, b) => b.score - a.score);
    let unique = {};
    data.forEach(d => {
      if (!unique[d.nick] || d.score > unique[d.nick]) {
        unique[d.nick] = d.score;
      }
    });
    let entries = Object.entries(unique).map(([nick, score]) => ({nick, score})).sort((a,b)=>b.score-a.score);
    let html = "<h2>Najlepsze wyniki</h2><table><tr><th>Nick</th><th>Wynik</th></tr>";
    entries.slice(0, 5).forEach(e => html += `<tr><td>${e.nick}</td><td>${e.score}</td></tr>`);
    html += "</table>";
    document.getElementById("scoreTable").innerHTML = html;
  });
}

function showScores() {
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("scoreTable").style.display = "block";
}

window.onload = fetchScores;