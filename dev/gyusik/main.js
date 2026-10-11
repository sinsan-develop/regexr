/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Workbench screen (design doc, screen 1): pattern, flags, one-sentence summary, railroad diagram,
test text with highlighting, and the side panel (explain / diagnose / suggest).
Works fully offline: the engines are JavaScript RegExp and PCRE2 (WebAssembly), both in workers.
*/

import {analyze, summary, explainRows, FLAG_NAMES} from "./model.js";
import {renderRailroad} from "./railroad.js";
import {diagnose, sortDiagnostics} from "./diagnose.js";
import JsSolver from "./JsSolver.js";
import {generate} from "./generate.js";
import {initAi} from "./aiui.js";
import PcreSolver from "../src/helpers/PcreSolver.js";

const $ = (id) => document.getElementById(id);
const FLAGS = {js: "gimsuy", pcre: "gimsx"};
const ERROR_TEXT = {
	timeout: "실행 시간이 너무 길어 중단했습니다. 패턴이 느려질 수 있는 형태인지 '진단' 탭을 확인하세요.",
	regexparse: "정규식을 해석하지 못했습니다.",
	pcreload: "PCRE2 엔진을 불러오지 못했습니다. 페이지를 새로 고쳐 보세요.",
	pcreexec: "PCRE2 실행 오류",
	infinite: "빈 문자열과 일치하는 결과가 있습니다 (표시되지 않음).",
	toomany: "일치가 5000개를 넘어 나머지는 표시하지 않습니다."
};

const SAMPLE = {
	pattern: "^(010)-(\\d{4})-(\\d{4})$",
	flags: "gm",
	text: "010-1234-5678\n010-123-5678\n010-9876-5432\n연락처: 010-5555-0000",
	engine: "js",
	view: "text",
	tests: [
		{id: 1, text: "010-1234-5678", expect: "match"},
		{id: 2, text: "010-9876-5432", expect: "match"},
		{id: 3, text: "010-123-5678", expect: "nomatch"},
		{id: 4, text: "011-1234-5678", expect: "nomatch"}
	]
};

let state = load();
let solvers = {js: new JsSolver(), pcre: null};
let ai = null;
let model = null, rows = [], diags = [], result = null, testRes = null, hot = null, tab = "explain", runSeq = 0, timer = 0;

function load() {
	try {
		let s = JSON.parse(localStorage.getItem("gyusik.workbench") || "null");
		if (s && typeof s.pattern === "string") { return Object.assign({}, SAMPLE, s); }
	} catch (e) {}
	return Object.assign({}, SAMPLE);
}
function save() { try { localStorage.setItem("gyusik.workbench", JSON.stringify(state)); } catch (e) {} }

const esc = (s) => s.replace(/[&<>]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));
const flagMap = () => { let o = {}; for (let c of state.flags) { o[c] = true; } return o; };

// ---------- mirrors (colored text behind the transparent textareas) ----------

function spans(text, cls) {
	// cls[k] is the class string for char k; merge equal neighbours.
	let out = "", start = 0;
	for (let k = 1; k <= text.length; k++) {
		if (k === text.length || cls[k] !== cls[start]) {
			let part = esc(text.substring(start, k));
			out += cls[start] ? "<span class=\"" + cls[start] + "\">" + part + "</span>" : part;
			start = k;
		}
	}
	return out + "\n"; // trailing newline keeps the last empty line visible
}

function paintPattern() {
	let p = state.pattern, cls = new Array(p.length).fill("");
	let mark = (i, end, c) => { for (let k = i; k < end && k < p.length; k++) { cls[k] = cls[k] ? cls[k] + " " + c : c; } };
	let walkAlt = (alt) => alt.branches.forEach((b) => b.items.forEach(walkNode));
	let walkNode = (n) => {
		if (n.kind === "group") {
			if (n.num) { mark(n.i, n.end, "g" + (((n.num - 1) % 6) + 1)); }
			walkAlt(n.body);
		} else if (n.kind === "quant") { walkNode(n.node); mark(n.qi, n.end, "q"); }
		else if (n.kind === "leaf" && /^(bof|eof)$/.test(n.type)) { mark(n.i, n.end, "anc"); }
	};
	walkAlt(model.ast);
	model.errors.forEach((e) => mark(e.i, e.i + Math.max(e.l, 1), e.warning ? "wrn" : "err"));
	if (hot) { mark(hot.i, hot.end, "hot"); }
	$("patMirror").innerHTML = spans(p, cls);
}

function paintText() {
	let t = state.text, cls = new Array(t.length).fill("");
	let mark = (i, end, c) => { for (let k = i; k < end && k < t.length; k++) { cls[k] = cls[k] ? cls[k] + " " + c : c; } };
	if (result) {
		for (let m of result.matches) {
			mark(m.i, m.i + m.l, "m");
			m.groups.forEach((g, gi) => {
				if (g.i >= 0 && g.l) { mark(g.i, g.i + g.l, "h" + (gi % 6 + 1) + (hot && hot.group === gi + 1 ? " hotg" : "")); }
			});
		}
	}
	$("txtMirror").innerHTML = spans(t, cls);
	let nfd = /[ᄀ-ᇿ]/.test(t);
	$("nfd").hidden = !nfd;
}

// ---------- panels ----------

function paintFlags() {
	let host = $("flags");
	host.textContent = "";
	for (let c of FLAGS[state.engine]) {
		let b = document.createElement("button");
		b.type = "button";
		b.className = "flag" + (state.flags.includes(c) ? " on" : "");
		b.innerHTML = "<code>" + c + "</code> " + FLAG_NAMES[c];
		b.setAttribute("aria-pressed", state.flags.includes(c));
		b.onclick = () => { setFlags(state.flags.includes(c) ? state.flags.replace(c, "") : state.flags + c); };
		host.appendChild(b);
	}
}

function paintExplain() {
	let h = "";
	for (let r of rows) {
		h += "<div class=\"row" + (r.plain ? " plain" : "") + "\" style=\"--d:" + r.depth + "\" data-i=\"" + r.i + "\" data-end=\"" + r.end + "\"" + (r.group ? " data-group=\"" + r.group + "\"" : "") + "><code class=\"" + (r.group ? "g" + (((r.group - 1) % 6) + 1) : "") + "\">" + esc(r.code) + "</code><span>" + esc(r.ko) + "</span></div>";
	}
	return h || "<p class=\"empty\">정규식을 입력하면 토큰마다 한국어 풀이가 나옵니다.</p>";
}

function paintDiag(levels) {
	let list = diags.filter((d) => levels.includes(d.level));
	if (!list.length) { return "<p class=\"empty\">" + (levels.includes("tip") ? "지금은 추천할 내용이 없습니다." : "발견한 문제가 없습니다.") + "</p>"; }
	return list.map((d, k) => {
		let label = {error: "오류", warn: "경고", tip: "추천"}[d.level];
		let range = d.i != null ? " data-i=\"" + d.i + "\" data-end=\"" + d.end + "\"" : "";
		return "<div class=\"card " + d.level + "\"" + range + "><div class=\"ct\"><span class=\"chip " + d.level + "\">" + label + "</span>" + esc(d.title) + "</div>" +
			"<p><b>왜</b> " + esc(d.why) + "</p><p><b>어떻게</b> " + esc(d.how) + "</p>" +
			(d.fix ? "<button type=\"button\" class=\"fixbtn\" data-fix=\"" + diags.indexOf(d) + "\">" + esc(d.fix.label) + "</button>" : "") + "</div>";
	}).join("");
}

function paintSide() {
	$("bDiag").textContent = diags.filter((d) => d.level !== "tip").length;
	$("bTips").textContent = diags.filter((d) => d.level === "tip").length;
	$("bDiag").classList.toggle("warn", diags.some((d) => d.level !== "tip"));
	$("panel").innerHTML = tab === "explain" ? paintExplain() : paintDiag(tab === "diag" ? ["error", "warn"] : ["tip"]);
	document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === tab));
	applyHot();
}

function paintStatus() {
	let n = result ? result.matches.length : 0;
	let risky = diags.some((d) => /느려질 수/.test(d.title));
	let err = result && result.error && !result.error.warning;
	$("count").textContent = err ? "" : n + "개 일치" + (result && result.time != null ? " (" + result.time.toFixed(1) + "ms)" : "");
	$("statusbar").innerHTML = "<span>일치 <b>" + (err ? "-" : n) + "개</b></span>" +
		"<span>실행 <b>" + (result && result.time != null ? result.time.toFixed(1) + "ms" : "-") + "</b></span>" +
		"<span>엔진 <b>" + (state.engine === "js" ? "JavaScript" : "PCRE2") + "</b></span>" +
		"<span>성능 <b class=\"" + (risky ? "bad" : "ok") + "\">" + (risky ? "백트래킹 위험 있음" : "위험 없음") + "</b></span>" +
		"<span>오류·경고 <b>" + diags.filter((d) => d.level !== "tip").length + "건</b></span>" +
		(state.tests.length ? (() => { let st = testStats(); return "<span>테스트 <b class=\"" + (st.known ? (st.pass === st.total ? "ok" : "bad") : "") + "\">" + (st.known ? st.pass + "/" + st.total + " 통과" : "-") + "</b></span>"; })() : "");
	let box = $("runError");
	let e = result && result.error;
	if (e && !(e.id === "infinite" && false)) {
		box.hidden = false;
		box.className = "banner " + (e.warning ? "warn" : "err");
		box.textContent = (ERROR_TEXT[e.id] || e.id) + (e.message ? " (" + e.message + ")" : "");
	} else { box.hidden = true; }
}

function applyHot() {
	document.querySelectorAll(".panel [data-i], #rr [data-i]").forEach((e) => {
		e.classList.toggle("hot", !!hot && +e.dataset.i === hot.i && +e.dataset.end === hot.end);
	});
}

function setHot(h) {
	if (hot && h && hot.i === h.i && hot.end === h.end) { return; }
	hot = h;
	paintPattern();
	paintText();
	applyHot();
}

// ---------- run ----------

function render() {
	let flagStr = state.flags;
	model = analyze(state.pattern, flagStr, state.engine);
	let fm = flagMap();
	rows = explainRows(model, fm);
	diags = sortDiagnostics(diagnose(model, fm, state.engine));
	$("summary").textContent = summary(model, fm);
	renderRailroad($("rr"), model, fm);
	paintPattern();
	paintSide();
	paintFlags();
	schedule();
}

function schedule() {
	clearTimeout(timer);
	timer = setTimeout(run, 60);
}

function run() {
	let seq = ++runSeq;
	let hasErr = model.errors.some((e) => !e.warning);
	if (!state.pattern || hasErr) {
		result = null;
		testRes = null;
		paintText();
		paintStatus();
		paintTestMarks();
		return;
	}
	if (state.engine === "pcre" && !solvers.pcre) { solvers.pcre = new PcreSolver(); }
	let req = {pattern: state.pattern, flags: state.flags, text: state.text, mode: "text", tests: null, tool: null};
	solvers[state.engine].solve(req, (r) => {
		if (seq !== runSeq) { return; }
		result = r;
		paintText();
		paintStatus();
		runTests(seq);
	});
}

// ---------- test cases ----------

// runs after the text run (the solvers handle one request at a time).
function runTests(seq) {
	if (!state.tests.length || !(result && !(result.error && !result.error.warning))) { testRes = null; paintTestMarks(); return; }
	let req = {pattern: state.pattern, flags: state.flags, mode: "tests", text: "", tests: state.tests.map((t) => ({id: t.id, text: t.text})), tool: null};
	solvers[state.engine].solve(req, (r) => {
		if (seq !== runSeq) { return; }
		testRes = r;
		paintTestMarks();
		paintStatus();
	});
}

function testOutcome(t) {
	if (!testRes || !testRes.matches || testRes.error && !testRes.error.warning) { return null; }
	let r = testRes.matches.find((m) => m.id === t.id);
	if (!r) { return null; }
	let matched = r.i != null;
	return {matched, pass: matched === (t.expect === "match")};
}

function testStats() {
	let pass = 0, total = state.tests.length, known = true;
	state.tests.forEach((t) => { let o = testOutcome(t); if (!o) { known = false; } else if (o.pass) { pass++; } });
	return {pass, total, known};
}

function paintTests() {
	let host = $("tests");
	host.textContent = "";
	state.tests.forEach((t, k) => {
		let row = document.createElement("div");
		row.className = "tcase";
		row.dataset.id = t.id;
		row.innerHTML = "<span class=\"mark\"></span><input type=\"text\" spellcheck=\"false\" aria-label=\"테스트 문자열 " + (k + 1) + "\"><select aria-label=\"기대 결과\"><option value=\"match\">일치해야 함</option><option value=\"nomatch\">일치하면 안 됨</option></select><button class=\"del\" type=\"button\" aria-label=\"삭제\">×</button><span class=\"why\" hidden></span>";
		let input = row.querySelector("input"), sel = row.querySelector("select");
		input.value = t.text;
		sel.value = t.expect;
		input.addEventListener("input", () => { t.text = input.value; save(); schedule(); });
		sel.addEventListener("change", () => { t.expect = sel.value; save(); paintTestMarks(); });
		row.querySelector(".del").onclick = () => { state.tests.splice(k, 1); save(); paintTests(); schedule(); };
		host.appendChild(row);
	});
	paintTestMarks();
}

function paintTestMarks() {
	state.tests.forEach((t) => {
		let row = document.querySelector(".tcase[data-id=\"" + t.id + "\"]");
		if (!row) { return; }
		let o = testOutcome(t), why = row.querySelector(".why");
		row.classList.toggle("pass", !!o && o.pass);
		row.classList.toggle("fail", !!o && !o.pass);
		row.querySelector(".mark").textContent = !o ? "" : o.pass ? "✓" : "✗";
		why.hidden = !o || o.pass;
		if (o && !o.pass) { why.textContent = t.expect === "match" ? "일치해야 하는데 일치하지 않았습니다." : "일치하면 안 되는데 일치했습니다."; }
	});
	let st = testStats(), b = $("bTests");
	b.textContent = st.known ? st.pass + "/" + st.total : state.tests.length;
	b.classList.toggle("ok", st.known && st.total > 0 && st.pass === st.total);
	b.classList.toggle("bad", st.known && st.pass < st.total);
}

function showView(v) {
	state.view = v;
	$("viewText").hidden = v !== "text";
	$("viewTests").hidden = v !== "tests";
	document.querySelectorAll(".segb").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
	save();
}

function setPattern(p) { state.pattern = p; $("pattern").value = p; sizeAll(); save(); render(); }
function setFlags(f) { state.flags = FLAGS[state.engine].split("").filter((c) => f.includes(c)).join(""); save(); render(); }

function sizeAll() {
	// the mirror decides the height; the textarea is stretched over it.
	[["patMirror", "patEditor"], ["txtMirror", "txtEditor"]].forEach(([m, e]) => { $(e).style.height = ""; });
}

// ---------- events ----------

$("pattern").addEventListener("input", (e) => { state.pattern = e.target.value.replace(/\n/g, ""); if (state.pattern !== e.target.value) { e.target.value = state.pattern; } save(); render(); });
$("pattern").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); } });
$("text").addEventListener("input", (e) => { state.text = e.target.value; save(); paintText(); schedule(); });
$("engine").addEventListener("change", (e) => {
	state.engine = e.target.value;
	state.flags = state.flags.split("").filter((c) => FLAGS[state.engine].includes(c)).join("");
	save();
	render();
});
$("addTest").onclick = () => {
	let id = state.tests.reduce((m, t) => Math.max(m, t.id), 0) + 1;
	state.tests.push({id, text: "", expect: "match"});
	save();
	paintTests();
	schedule();
	let rows = document.querySelectorAll(".tcase input");
	rows[rows.length - 1].focus();
};
document.querySelectorAll(".segb").forEach((b) => b.onclick = () => showView(b.dataset.view));
$("nfdFix").onclick = () => { state.text = state.text.normalize("NFC"); $("text").value = state.text; save(); paintText(); schedule(); };
document.querySelectorAll(".tab").forEach((b) => b.onclick = () => { tab = b.dataset.tab; paintSide(); });
$("panel").addEventListener("click", (e) => {
	let b = e.target.closest("[data-fix]");
	if (!b) { return; }
	let f = diags[+b.dataset.fix].fix;
	if (f.flags != null) { state.flags = f.flags; }
	if (f.pattern != null) { state.pattern = f.pattern; $("pattern").value = f.pattern; }
	save();
	render();
});
document.addEventListener("mouseover", (e) => {
	let t = e.target.closest && e.target.closest("[data-i]");
	setHot(t ? {i: +t.dataset.i, end: +t.dataset.end, group: t.dataset.group ? +t.dataset.group : null} : null);
});
$("txtEditor").addEventListener("scroll", () => {}, true);

// textarea and mirror must scroll together
function syncScroll(id, mirror) { $(id).addEventListener("scroll", () => { $(mirror).style.transform = "translate(" + -$(id).scrollLeft + "px," + -$(id).scrollTop + "px)"; }); }
syncScroll("text", "txtMirror");

// ---------- make from examples (screen 2) ----------

const lines = (el) => el.value.split(/\r?\n/).map((x) => x.replace(/\s+$/, "")).filter((x) => x !== "");

function setMode(m) {
	document.querySelector(".wb").hidden = m !== "bench";
	$("makeView").hidden = m !== "make";
	$("settingsView").hidden = m !== "settings";
	document.querySelectorAll(".mode[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
	if (m === "make") { fillMake(); if (ai) { ai.refresh(); } }
}

function mkTab(nl) {
	$("mkNl").hidden = !nl;
	$("mkEx").hidden = nl;
	$("mkExGo").hidden = nl;
	$("mkTabNl").classList.toggle("on", nl);
	$("mkTabEx").classList.toggle("on", !nl);
	if (nl && ai) { ai.refresh(); }
}

function fillMake() {
	$("mkPos").value = state.tests.filter((t) => t.expect === "match").map((t) => t.text).join("\n");
	$("mkNeg").value = state.tests.filter((t) => t.expect === "nomatch").map((t) => t.text).join("\n");
}

// the two text boxes and the workbench test cases are the same data.
function syncTestsFromMake() {
	let id = 0;
	state.tests = lines($("mkPos")).map((text) => ({id: ++id, text, expect: "match"})).concat(lines($("mkNeg")).map((text) => ({id: ++id, text, expect: "nomatch"})));
	save();
	paintTests();
}

function paintCandidates(list) {
	let host = $("mkList");
	$("mkCount").textContent = list.length ? "후보 " + list.length + "개" : "후보";
	if (!list.length) { host.innerHTML = "<p class=\"empty\">일치해야 할 예시를 한 줄 이상 넣어 주세요.</p>"; return; }
	host.innerHTML = list.map((c, k) => {
		let all = c.pass === c.total;
		let m = analyze(c.pattern, "", "js");
		let fails = (c.missed.length ? "일치해야 하는데 안 된 예: " + c.missed.map((x) => "\"" + esc(x) + "\"").join(", ") : "") + (c.missed.length && c.leaked.length ? " · " : "") + (c.leaked.length ? "일치하면 안 되는데 된 예: " + c.leaked.map((x) => "\"" + esc(x) + "\"").join(", ") : "");
		return "<div class=\"cand" + (k === 0 && all ? " best" : "") + "\"><div class=\"hd\">" + (k === 0 && all ? "<span class=\"chip tip\">추천</span>" : "") + "<b>" + esc(c.title) + "</b><span class=\"src\">" + esc(c.source) + "</span></div>" +
			"<pre>" + esc(c.pattern) + "</pre><p>" + esc(summary(m, {})) + "</p>" + (c.note ? "<p class=\"limit\">" + esc(c.note) + "</p>" : "") +
			"<div class=\"ft\"><span class=\"" + (all ? "ok" : "bad") + "\">" + (all ? "예시 " + c.total + "개 모두 통과" : c.pass + "/" + c.total + " 통과" + (fails ? " · " + fails : "")) + "</span><button type=\"button\" class=\"send\" data-k=\"" + k + "\">작업대로 보내기</button></div></div>";
	}).join("");
	host.querySelectorAll(".send").forEach((b) => b.onclick = () => {
		let c = list[+b.dataset.k];
		state.pattern = c.pattern;
		state.flags = "";
		$("pattern").value = c.pattern;
		save();
		setMode("bench");
		showView("tests");
		render();
	});
}

document.querySelectorAll(".mode[data-mode]").forEach((b) => b.onclick = () => setMode(b.dataset.mode));
$("mkPos").addEventListener("input", syncTestsFromMake);
$("mkNeg").addEventListener("input", syncTestsFromMake);
$("mkGo").onclick = () => { syncTestsFromMake(); paintCandidates(generate(lines($("mkPos")), lines($("mkNeg")))); };

$("mkTabEx").onclick = () => mkTab(false);
$("mkTabNl").onclick = () => mkTab(true);
$("openSettings").onclick = () => setMode("settings");
$("setBack").onclick = () => setMode("bench");
ai = initAi({
	$, esc, lines,
	getState: () => state,
	exampleCount: () => lines($("mkPos")).length + lines($("mkNeg")).length,
	showExamples: () => mkTab(false),
	showSettings: () => setMode("settings"),
	sendToBench: (pattern, flags) => {
		state.pattern = pattern;
		state.flags = FLAGS[state.engine].split("").filter((c) => flags.includes(c)).join("");
		$("pattern").value = pattern;
		save();
		setMode("bench");
		showView("tests");
		render();
	}
});

$("mkPos").addEventListener("input", () => ai && ai.refresh());
$("mkNeg").addEventListener("input", () => ai && ai.refresh());

// ---------- start ----------

$("engine").value = state.engine;
$("pattern").value = state.pattern;
$("text").value = state.text;
paintTests();
showView(state.view);
render();
window.gyusik = {get state() { return state; }, get model() { return model; }, get result() { return result; }, get diags() { return diags; }, get testRes() { return testRes; }};
