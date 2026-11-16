/* Global namespace + tiny helpers shared by every module. Loaded first. */
window.G = window.G || {};
G.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));          // random int a..b
G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];          // random element
G.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
G.wait = (ms) => new Promise((r) => setTimeout(r, ms));
