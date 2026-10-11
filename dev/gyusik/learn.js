/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Based on RegExr, Copyright (C) 2017 gskinner.com, inc. Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Learn screen (design doc, screen 4): lesson list, explanation with live railroad diagrams,
and practice tasks graded instantly. Everything runs offline; progress is kept on this device.
Practice patterns are typed by the learner, so they run in a worker (JsSolver) like the workbench.
*/

import {LESSONS} from "./lessons.js";
import {analyze} from "./model.js";
import {renderRailroad} from "./railroad.js";
import JsSolver from "./JsSolver.js";

const KEY = "gyusik.learn";

export function initLearn(ctx) {
	let $ = ctx.$, esc = ctx.esc;
	let prog = {done: {}, cur: 0};
	try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
	if (!prog.done) { prog.done = {}; }
	if (!(prog.cur >= 0 && prog.cur < LESSONS.length)) { prog.cur = 0; }
	let solver = new JsSolver(), timers = {};

	const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) {} };
	const lessonDone = (l) => l.tasks.every((t) => prog.done[t.id]);

	function paintNav() {
		$("lnNav").innerHTML = "<div class=\"label\">강의</div>" + LESSONS.map((l, k) => {
			let done = lessonDone(l), tasksDone = l.tasks.filter((t) => prog.done[t.id]).length;
			return "<button type=\"button\" class=\"lnitem" + (k === prog.cur ? " cur" : "") + "\" data-k=\"" + k + "\"><span class=\"no\">" + (k + 1) + "</span><span>" + esc(l.title) + "</span><span class=\"st" + (done ? " done" : "") + "\">" + (done ? "완료" : tasksDone ? tasksDone + "/" + l.tasks.length : "") + "</span></button>";
		}).join("") + "<div class=\"lnsoon\">7강 이후(많이 vs 적게, 앞뒤 살피기, 엔진마다 다른 점, 느려지는 패턴, 한글 다루기)는 준비 중입니다.</div>";
		$("lnNav").querySelectorAll(".lnitem").forEach((b) => b.onclick = () => { prog.cur = +b.dataset.k; save(); show(); });
	}

	function show() {
		let l = LESSONS[prog.cur];
		paintNav();
		let h = "<span class=\"label\">" + (prog.cur + 1) + "강 · " + esc(l.term) + "</span><h2>" + esc(l.title) + "</h2>" + l.body.join("");
		h += "<div class=\"lnex\">" + l.examples.map((e, k) => "<div class=\"lnexbox\"><div class=\"lnexhd\"><code>" + esc(e.pattern) + "</code><span class=\"muted\">" + esc(e.note) + "</span></div><div class=\"rr\" data-ex=\"" + k + "\"></div></div>").join("") + "</div>";
		h += l.tasks.map((t, k) => "<div class=\"task\" data-id=\"" + t.id + "\"><div class=\"label\">실습 " + (k + 1) + "/" + l.tasks.length + " <span class=\"taskdone\" hidden>✓ 통과</span></div><p>" + t.prompt + "</p>" +
			"<input type=\"text\" class=\"tin\" spellcheck=\"false\" autocomplete=\"off\" aria-label=\"패턴 입력\" placeholder=\"여기에 정규식을 쓰세요\"><table class=\"tcases\"></table>" +
			"<div class=\"fieldrow\"><button type=\"button\" class=\"send hintbtn\">힌트</button><button type=\"button\" class=\"send solbtn\" hidden>정답 보기</button><button type=\"button\" class=\"send openbtn\">작업대에서 열기</button></div><p class=\"hinttext muted\" hidden></p></div>").join("");
		h += "<div class=\"lnfoot\">" + (prog.cur < LESSONS.length - 1 ? "<button type=\"button\" class=\"primary\" id=\"lnNext\">다음 강의: " + esc(LESSONS[prog.cur + 1].title) + "</button>" : "<button type=\"button\" class=\"primary\" id=\"lnBench\">작업대에서 직접 써 보기</button>") + "<span class=\"muted\">" + l.next + "</span></div>";
		$("lnBody").innerHTML = h;
		$("lnBody").scrollTop = 0;
		window.scrollTo(0, 0);
		l.examples.forEach((e, k) => renderRailroad($("lnBody").querySelector("[data-ex=\"" + k + "\"]"), analyze(e.pattern, "", "js"), {}));
		l.tasks.forEach((t) => wireTask(t));
		let nx = $("lnNext"); if (nx) { nx.onclick = () => { prog.cur++; save(); show(); }; }
		let bn = $("lnBench"); if (bn) { bn.onclick = ctx.openBench; }
	}

	function wireTask(t) {
		let box = $("lnBody").querySelector(".task[data-id=\"" + t.id + "\"]");
		let input = box.querySelector(".tin"), table = box.querySelector(".tcases");
		let paint = (res, msg) => {
			table.innerHTML = t.cases.map((c, k) => {
				let r = res && res.matches && res.matches.find((m) => m.id === k);
				let found = r ? r.i != null : null;
				let ok = found === null ? null : found === c.expect;
				return "<tr class=\"" + (ok === null ? "" : ok ? "ok" : "bad") + "\"><td><code>" + (c.text === "" ? "(빈 줄)" : esc(c.text)) + "</code></td><td>" + (c.expect ? "찾아야 함" : "건너뛰어야 함") + "</td><td class=\"res\">" + (ok === null ? "" : ok ? "✓ " + (found ? "찾음" : "건너뜀") : "✗ " + (found ? "찾았음" : "건너뜀")) + "</td></tr>";
			}).join("") + (msg ? "<tr><td colspan=\"3\" class=\"bad\">" + esc(msg) + "</td></tr>" : "");
			let all = res && res.matches && t.cases.every((c, k) => { let r = res.matches.find((m) => m.id === k); return r && ((r.i != null) === c.expect); });
			box.classList.toggle("pass", !!all);
			box.querySelector(".taskdone").hidden = !all;
			if (all && !prog.done[t.id]) { prog.done[t.id] = true; save(); paintNav(); }
		};
		paint(null);
		let run = () => {
			let p = input.value;
			if (p === "") { paint(null); return; }
			solver.solve({pattern: p, flags: "", mode: "tests", text: "", tests: t.cases.map((c, k) => ({id: k, text: c.text}))}, (res) => {
				if (res.error && !res.error.warning) { paint(null, res.error.id === "timeout" ? "너무 오래 걸려 중단했습니다." : "정규식 문법 오류: " + (res.error.message || "")); return; }
				paint(res);
			});
		};
		input.addEventListener("input", () => { clearTimeout(timers[t.id]); timers[t.id] = setTimeout(run, 150); });
		let hint = box.querySelector(".hinttext"), sol = box.querySelector(".solbtn");
		box.querySelector(".hintbtn").onclick = () => { hint.hidden = false; hint.textContent = "힌트: " + t.hint; sol.hidden = false; };
		sol.onclick = () => { hint.hidden = false; hint.innerHTML = "정답 예: <code>" + esc(t.solution) + "</code> <button type=\"button\" class=\"send putbtn\">넣어 보기</button>"; hint.querySelector(".putbtn").onclick = () => { input.value = t.solution; run(); }; };
		box.querySelector(".openbtn").onclick = () => ctx.openInBench(input.value || t.solution, t.cases);
		if (prog.done[t.id]) { box.classList.add("pass"); box.querySelector(".taskdone").hidden = false; }
	}

	return {show};
}
